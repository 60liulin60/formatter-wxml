const fs = require('fs');
const path = require('path');

// 直接验证编译后的生产核心，避免与 src 双份实现分叉
const {
  formatWxml,
  createDefaultConfig,
} = require('../out/format-core');

/** 测试使用的默认配置（与插件默认一致） */
const mockConfig = createDefaultConfig();

/** 兼容旧导出：提供 format 方法的薄包装 */
class WXMLFormatter {
  format(text) {
    return formatWxml(text, mockConfig);
  }
}

// 测试用例（含 expected 的做严格比对）
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
    description: '测试多属性标签的换行格式化',
    expected: `<button
  class="btn"
  style="color: red;"
  bind:tap="onTap"
  data-id="{{item.id}}"
  data-type="{{item.type}}"
  disabled="{{loading}}"
>
  提交
</button>
`
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
  },
  {
    name: '长标签换行测试',
    input: '<view class="very-long-class-name-that-makes-the-tag-exceed-100-characters" data-id="12345" style="color: red;">内容</view>',
    description: '测试标签长度超过100字符时的换行',
  },
  {
    name: '标签结束符号不在同一行格式化问题',
    input: '<text class="tip-wrap cashback-wrap" wx:if="{{item.incomeSource && item.incomeSource === \'platform_cashback\'}}" >限时奖励</text>',
    description: '测试开始标签的 > 与属性不同行时，内联 text 标签仍保持同一行',
    expected: `<text
  class="tip-wrap cashback-wrap"
  wx:if="{{item.incomeSource && item.incomeSource === 'platform_cashback'}}"
>限时奖励</text>
`
  },
  {
    name: 'text 标签格式化问题 - 多属性换行仍应同行输出',
    input: '<text class="title" data-id="123" bind:tap="handleTap" style="color:red">这是文本内容</text>',
    description: '测试 text 标签多属性换行时，内容与 </text> 仍与最后一个属性行保持同一行',
    expected: `<text
  class="title"
  data-id="123"
  bind:tap="handleTap"
  style="color:red"
>这是文本内容</text>
`
  },
  {
    name: 'text 标签格式化问题 - 布尔属性换行仍应同行输出',
    input: '<text class="asda" tabindex assdassd asd>asdasdasdsaaszdasd asdasdasd asdasd asd asd asd asd asd asd asd a</text>',
    description: '测试 text 标签包含布尔属性且触发换行时，内容与 </text> 仍与最后一个属性行保持同一行',
    expected: `<text
  class="asda"
  tabindex
  assdassd
  asd
>asdasdasdsaaszdasd asdasdasd asdasd asd asd asd asd asd asd asd a</text>
`
  },
  {
    name: 'text 标签格式化问题 - 小于阈值保持单行',
    input: '<text class="tip-wrap cashback-wrap">限时奖励</text>',
    description: '测试 text 标签属性少于3且标签长度不超过100时保持单行',
    expected: `<text class="tip-wrap cashback-wrap">限时奖励</text>
`
  },
  {
    name: '同名标签多次出现时长度阈值仍正确',
    input: '<view class="short"><text class="a">一</text></view><view class="very-long-class-name-that-makes-the-tag-exceed-100-characters-xxxxxxxxxxxx" data-id="1">二</view>',
    description: '覆盖原 originalLength 按位置匹配失败：两个 view 中仅超长者应属性换行',
    expected: `<view class="short">
  <text class="a">一</text>
</view>
<view
  class="very-long-class-name-that-makes-the-tag-exceed-100-characters-xxxxxxxxxxxx"
  data-id="1"
>
  二
</view>
`
  },
  {
    name: '注释伪标签不污染长度判定',
    input: `<!-- <view class="${'x'.repeat(120)}"> --><view class="short">内容</view>`,
    description: '测试注释内的超长伪标签不会使后续短标签误换行',
    expected: `<!-- <view class="${'x'.repeat(120)}"> -->
<view class="short">内容</view>
`
  },
  {
    name: '属性值包含大于号',
    input: '<view data-text="a > b"><text>x</text></view>',
    description: '测试引号内的大于号不会提前截断开始标签',
    expected: `<view data-text="a > b">
  <text>x</text>
</view>
`
  },
  {
    name: '表达式与事件指令直接解析',
    input: '<view wx:if="{{count > 0}}" bind:tap="handleTap"><text>{{user.name}}</text></view>',
    description: '测试不使用占位符时仍能完整保留表达式与指令名',
    expected: `<view wx:if="{{count > 0}}" bind:tap="handleTap">
  <text>{{user.name}}</text>
</view>
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

  console.log('开始运行 WXML 格式化器测试...\n');

  let passed = 0;
  let failed = 0;

  testCases.forEach((testCase, index) => {
    console.log(`测试 ${index + 1}: ${testCase.name}`);
    console.log(`描述: ${testCase.description}`);
    console.log('输入:');
    console.log(testCase.input);

    try {
      const formatted = formatter.format(testCase.input);
      console.log('输出:');
      console.log(formatted);

      const safeName = testCase.name.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '-');
      const outputFile = path.join(outputDir, `test-${index + 1}-${safeName}.wxml`);
      fs.writeFileSync(outputFile, formatted, 'utf8');
      console.log(`结果已保存到: ${outputFile}`);

      // 所有用例都验证二次格式化稳定，防止输出逐次漂移
      const reformatted = formatter.format(formatted);
      if (testCase.expected && formatted !== testCase.expected) {
        console.log('测试失败: 输出与期望不符');
        console.log('期望:');
        console.log(testCase.expected);
        failed += 1;
      } else if (reformatted !== formatted) {
        console.log('测试失败: 二次格式化结果不一致');
        failed += 1;
      } else {
        console.log('测试通过\n');
        passed += 1;
      }
    } catch (error) {
      console.log(`测试失败: ${error.message}\n`);
      failed += 1;
    }
  });

  console.log(`测试完成！通过: ${passed}, 失败: ${failed}`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runTests();
}

module.exports = { WXMLFormatter, formatWxml, createDefaultConfig, testCases, runTests };
