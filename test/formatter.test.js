const fs = require('fs');
const path = require('path');

// 配置
const mockConfig = {
  indentSize: 2,
  maxLineLength: 120,
  preserveNewlines: true,
  wrapAttributes: 3,
  alignAttributes: true,
  sortAttributes: false,
  selfClosingTags: [
    "image", "input", "icon", "video", "audio", "camera",
    "live-player", "live-pusher", "map", "canvas", "web-view",
    "ad", "official-account", "open-data"
  ],
  inlineTags: ["text", "icon", "rich-text"],
  blockTags: [
    "view", "scroll-view", "swiper", "swiper-item", "movable-area", "movable-view",
    "cover-view", "cover-image", "page-container", "share-element",
    "form", "picker", "picker-view", "picker-view-column", "slider", "switch", "textarea",
    "navigator", "functional-page-navigator", "live-player", "live-pusher",
    "map", "canvas", "web-view", "ad", "official-account", "open-data",
    "rich-text", "progress", "button", "checkbox", "radio", "label",
    "editor", "keyboard-accessory", "match-media", "page-meta", "navigation-bar",
    "custom-tab-bar", "voip-room", "subscribe", "favorites", "block",
    "template", "import", "include", "wxs", "slot"
  ],
};

const EXPR_PLACEHOLDER = "__WXML_EXPR_";
const DIR_PLACEHOLDER = "__WXML_DIR_";

class WXMLFormatter {
  constructor() {
    this.expressions = [];
    this.directives = [];
  }

  getConfiguration() {
    return mockConfig;
  }

  format(text) {
    this.expressions = [];
    this.directives = [];

    const config = this.getConfiguration();

    let result = this.protectSpecialSyntax(text);
    result = this.normalizeSelfClosingTags(result, config.selfClosingTags);
    const tokens = this.tokenize(result);
    result = this.buildDocument(tokens, config);
    result = this.restoreSpecialSyntax(result);
    result = this.finalCleanup(result);

    return result;
  }

  protectSpecialSyntax(text) {
    let result = text;

    result = result.replace(/\{\{[^}]*(?:\{[^}]*\}[^}]*)*\}\}/g, (match) => {
      const index = this.expressions.length;
      this.expressions.push(match);
      return `${EXPR_PLACEHOLDER}${index}__`;
    });

    result = result.replace(/(wx:|bind:|catch:|capture-bind:|capture-catch:)[\w-]+/g, (match) => {
      const index = this.directives.length;
      this.directives.push(match);
      return `${DIR_PLACEHOLDER}${index}__`;
    });

    return result;
  }

  restoreSpecialSyntax(text) {
    let result = text;

    result = result.replace(new RegExp(`${DIR_PLACEHOLDER}(\\d+)__`, 'g'), (_, index) => {
      return this.directives[parseInt(index)] || _;
    });

    result = result.replace(new RegExp(`${EXPR_PLACEHOLDER}(\\d+)__`, 'g'), (_, index) => {
      return this.expressions[parseInt(index)] || _;
    });

    return result;
  }

  normalizeSelfClosingTags(text, selfClosingTags) {
    let result = text;

    for (const tagName of selfClosingTags) {
      result = result.replace(
        new RegExp(`<${tagName}(\\s[^>]*?)?><\\/${tagName}>`, 'g'),
        (_, attrs) => `<${tagName}${attrs || ''} />`
      );

      result = result.replace(
        new RegExp(`<${tagName}([^>]*?)\\s*/>`, 'g'),
        (_, attrs) => {
          const trimmed = attrs.trim();
          return trimmed ? `<${tagName} ${trimmed} />` : `<${tagName} />`;
        }
      );
    }

    return result;
  }

  tokenize(text) {
    const tokens = [];
    const cleaned = text.replace(/\s+/g, ' ').trim();
    
    const regex = /<!\-\-[\s\S]*?\-\->|<\/[\w-]+>|<[\w-]+[^>]*\/>|<[\w-]+[^>]*>|[^<]+/g;
    let match;

    while ((match = regex.exec(cleaned)) !== null) {
      const content = match[0].trim();
      if (!content) continue;

      if (content.startsWith('<!--')) {
        tokens.push({ type: 'comment', content });
      } else if (content.startsWith('</')) {
        const tagName = content.match(/<\/([\w-]+)/)?.[1] || '';
        tokens.push({ type: 'close', content, tagName });
      } else if (content.endsWith('/>')) {
        const tagName = content.match(/<([\w-]+)/)?.[1] || '';
        const attrStr = content.slice(tagName.length + 1, -2);
        tokens.push({ 
          type: 'selfClose', 
          content, 
          tagName,
          attributes: this.parseAttributes(attrStr)
        });
      } else if (content.startsWith('<')) {
        const tagName = content.match(/<([\w-]+)/)?.[1] || '';
        const attrStr = content.slice(tagName.length + 1, -1);
        tokens.push({ 
          type: 'open', 
          content, 
          tagName,
          attributes: this.parseAttributes(attrStr)
        });
      } else {
        tokens.push({ type: 'text', content });
      }
    }

    return tokens;
  }

  buildDocument(tokens, config) {
    const lines = [];
    const indent = ' '.repeat(config.indentSize);
    let depth = 0;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const nextToken = tokens[i + 1];
      const nextNextToken = tokens[i + 2];

      if (token.type === 'close') {
        depth = Math.max(0, depth - 1);
        lines.push(indent.repeat(depth) + token.content);
        continue;
      }

      // 处理多属性开始标签（优先级高于短文本）
      if (token.type === 'open' && 
          token.attributes && 
          token.attributes.length > config.wrapAttributes) {
        lines.push(indent.repeat(depth) + `<${token.tagName}`);
        for (let j = 0; j < token.attributes.length; j++) {
          const attr = token.attributes[j];
          const isLast = j === token.attributes.length - 1;
          // 布尔属性（value 为空）只输出属性名
          const attrStr = attr.value ? `${attr.name}=${attr.value}` : attr.name;
          lines.push(indent.repeat(depth + 1) + `${attrStr}${isLast ? '>' : ''}`);
        }
        depth++;
        continue;
      }

      // 内联标签
      if (token.type === 'open' && 
          config.inlineTags.includes(token.tagName || '') &&
          nextToken?.type === 'text' &&
          nextNextToken?.type === 'close' &&
          nextNextToken.tagName === token.tagName) {
        lines.push(indent.repeat(depth) + token.content + nextToken.content + nextNextToken.content);
        i += 2;
        continue;
      }

      // 短文本保持同行
      if (token.type === 'open' &&
          nextToken?.type === 'text' &&
          nextNextToken?.type === 'close' &&
          nextNextToken.tagName === token.tagName &&
          nextToken.content.length <= 50) {
        lines.push(indent.repeat(depth) + token.content + nextToken.content + nextNextToken.content);
        i += 2;
        continue;
      }

      // 多属性自闭合标签
      if (token.type === 'selfClose' && 
          token.attributes && 
          token.attributes.length > config.wrapAttributes) {
        lines.push(indent.repeat(depth) + `<${token.tagName}`);
        for (let j = 0; j < token.attributes.length; j++) {
          const attr = token.attributes[j];
          const isLast = j === token.attributes.length - 1;
          // 布尔属性（value 为空）只输出属性名
          const attrStr = attr.value ? `${attr.name}=${attr.value}` : attr.name;
          lines.push(indent.repeat(depth + 1) + `${attrStr}${isLast ? ' />' : ''}`);
        }
        continue;
      }

      lines.push(indent.repeat(depth) + token.content);

      if (token.type === 'open') {
        depth++;
      }
    }

    return lines.join('\n') + '\n';
  }

  parseAttributes(attrString) {
    const attrs = [];
    const cleaned = attrString.replace(/\s+/g, ' ').trim();
    
    if (!cleaned) return attrs;
    
    // 支持普通属性、占位符属性和布尔属性
    // 匹配: name="value" 或 name='value' 或 name (布尔属性)
    const regex = /([\w-:]+|__WXML_\w+_\d+__)(?:=("[^"]*"|'[^']*'))?/g;
    let match;

    while ((match = regex.exec(cleaned)) !== null) {
      const name = match[1];
      const value = match[2] || ''; // 布尔属性没有值
      attrs.push({ name, value });
    }

    return attrs;
  }

  finalCleanup(text) {
    let result = text;
    result = result.replace(/<([\w-]+)([a-zA-Z][^=\s>]*=)/g, '<$1 $2');
    result = result.replace(
      /(wx:|bind:|catch:|capture-bind:|capture-catch:)(\w+)(\s*=\s*)(['"])/g,
      '$1$2=$4'
    );
    return result;
  }
}

// 测试用例
const testCases = [
  {
    name: '简单WXML格式化',
    input: '<view class="container"><text wx:if="{{show}}">Hello World</text><button bind:tap="onTap" class="btn">Click Me</button></view>',
    description: '测试基本的WXML元素格式化'
  },
  {
    name: '条件渲染格式化',
    input: '<view><text wx:if="{{condition}}">显示文本</text><text wx:elif="{{other}}">其他文本</text><text wx:else>默认文本</text></view>',
    description: '测试wx:if, wx:elif, wx:else的格式化'
  },
  {
    name: '列表渲染格式化',
    input: '<view wx:for="{{list}}" wx:key="id" wx:for-item="item" wx:for-index="index"><text>{{item.name}}</text></view>',
    description: '测试wx:for循环的格式化'
  },
  {
    name: '事件绑定格式化',
    input: '<button bind:tap="onTap" catch:touchstart="onTouch" capture-bind:longpress="onLongPress">按钮</button>',
    description: '测试各种事件绑定的格式化'
  },
  {
    name: '双花括号表达式保护',
    input: '<text>{{user.name + " - " + user.age}}</text><view class="{{isActive ? \'active\' : \'inactive\'}}">内容</view>',
    description: '测试复杂表达式的保护'
  },
  {
    name: '复杂嵌套表达式',
    input: '<view class="{{item.status === \'active\' ? (item.type === \'vip\' ? \'vip-active\' : \'normal-active\') : \'inactive\'}}"><text>{{item.data && item.data.user ? item.data.user.name : \'未知用户\'}}</text></view>',
    description: '测试复杂嵌套的双花括号表达式'
  },
  {
    name: '自闭合标签格式化',
    input: '<view><image src="{{avatar}}" mode="aspectFit"></image><input type="text" placeholder="请输入"></input><icon type="success" size="20"></icon></view>',
    description: '测试自闭合标签的格式化'
  },
  {
    name: '多属性标签换行',
    input: '<button class="btn" style="color: red;" bind:tap="onTap" data-id="{{item.id}}" data-type="{{item.type}}" disabled="{{loading}}">提交</button>',
    description: '测试多属性标签的换行格式化'
  },
  {
    name: '微信小程序组件',
    input: '<scroll-view scroll-y="true" class="scroll-area"><swiper indicator-dots="{{true}}" autoplay="{{false}}" interval="{{5000}}"><swiper-item><image src="{{item.url}}" mode="aspectFill"></image></swiper-item></swiper></scroll-view>',
    description: '测试微信小程序特有组件的格式化'
  },
  {
    name: '表单组件格式化',
    input: '<form bind:submit="onSubmit"><input name="username" placeholder="用户名" value="{{form.username}}" bind:input="onInput"/><textarea name="content" placeholder="请输入内容" value="{{form.content}}" bind:input="onTextareaInput"></textarea><button form-type="submit">提交</button></form>',
    description: '测试表单相关组件的格式化'
  },
  {
    name: '标签层级和换行测试',
    input: '<view class="container"><view class="header"><text class="title">标题</text></view><view class="content"><view class="item"><text>项目1</text></view><view class="item"><text>项目2</text></view></view></view>',
    description: '测试标签层级缩进和换行是否正确'
  },
  {
    name: 'Swiper组件换行测试',
    input: '<swiper indicator-dots="true"><swiper-item><view>页面1</view></swiper-item><swiper-item><view>页面2</view></swiper-item></swiper>',
    description: '测试swiper组件的换行格式化',
    expected: `<swiper indicator-dots="true">
  <swiper-item>
    <view>页面1</view>
  </swiper-item>
  <swiper-item>
    <view>页面2</view>
  </swiper-item>
</swiper>
`
  },
  {
    name: '布尔属性保留测试',
    input: '<input type="text" disabled required placeholder="请输入" maxlength="100" />',
    description: '测试布尔属性（disabled、required）的保留',
    expected: `<input
  type="text"
  disabled
  required
  placeholder="请输入"
  maxlength="100" />
`
  }
];

// 运行测试
function runTests() {
  const formatter = new WXMLFormatter();
  const outputDir = path.join(__dirname, 'output');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log('🧪 开始运行WXML格式化器测试...\n');
  
  let passed = 0;
  let failed = 0;
  
  testCases.forEach((testCase, index) => {
    console.log(`📝 测试 ${index + 1}: ${testCase.name}`);
    console.log(`📋 描述: ${testCase.description}`);
    console.log('📥 输入:');
    console.log(testCase.input);
    
    try {
      const formatted = formatter.format(testCase.input);
      console.log('📤 输出:');
      console.log(formatted);
      
      const outputFile = path.join(outputDir, `test-${index + 1}-${testCase.name.replace(/\s+/g, '-')}.wxml`);
      fs.writeFileSync(outputFile, formatted);
      console.log(`💾 结果已保存到: ${outputFile}`);
      
      if (testCase.expected && formatted !== testCase.expected) {
        console.log('❌ 测试失败: 输出与期望不符');
        console.log('期望:');
        console.log(testCase.expected);
        failed++;
      } else {
        console.log('✅ 测试通过\n');
        passed++;
      }
    } catch (error) {
      console.log(`❌ 测试失败: ${error.message}\n`);
      failed++;
    }
  });
  
  console.log(`🎉 测试完成！通过: ${passed}, 失败: ${failed}`);
}

if (require.main === module) {
  runTests();
}

module.exports = { WXMLFormatter, testCases, runTests };
