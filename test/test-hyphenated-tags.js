const fs = require('fs');

// 模拟 vscode 模块
const vscode = {
  workspace: {
    getConfiguration: (section) => ({
      get: (key, defaultValue) => {
        const config = {
          'indentSize': 2,
          'maxLineLength': 120,
          'preserveNewlines': true,
          'wrapAttributes': 3,
          'alignAttributes': true,
          'sortAttributes': false,
          'selfClosingTags': ['image', 'input', 'icon'],
          'inlineTags': ['text', 'icon'],
          'blockTags': [
            'view', 'scroll-view', 'swiper', 'swiper-item', 'form', 'button',
            'navigator', 'picker', 'picker-view', 'slider', 'switch', 'textarea',
            'cover-view', 'cover-image', 'movable-area', 'movable-view'
          ]
        };
        return config[key] !== undefined ? config[key] : defaultValue;
      }
    })
  }
};

global.vscode = vscode;
const { WXMLFormatter } = require('./out/formatter.js');

// 测试各种带连字符的标签
const testCases = [
  {
    name: 'scroll-view 标签',
    input: '<scroll-view class="container" scroll-x="true" scroll-y="false" bindscroll="onScroll"><view>内容</view></scroll-view>'
  },
  {
    name: 'swiper-item 标签',
    input: '<swiper indicator-dots="true"><swiper-item class="item" data-id="1"><view>页面1</view></swiper-item><swiper-item class="item" data-id="2"><view>页面2</view></swiper-item></swiper>'
  },
  {
    name: 'picker-view 标签',
    input: '<picker-view class="picker" value="{{value}}" bindchange="onChange"><picker-view-column><view>选项1</view></picker-view-column></picker-view>'
  },
  {
    name: 'cover-view 和 cover-image 标签',
    input: '<cover-view class="cover" style="position: absolute;"><cover-image src="{{imageUrl}}" class="cover-img"></cover-image><text>覆盖文本</text></cover-view>'
  },
  {
    name: 'movable-area 和 movable-view 标签',
    input: '<movable-area class="area" style="height: 200px;"><movable-view class="movable" direction="all" x="{{x}}" y="{{y}}">可移动</movable-view></movable-area>'
  }
];

console.log('=== 测试带连字符的标签格式化 ===\n');

const formatter = new WXMLFormatter();

testCases.forEach((testCase, index) => {
  console.log(`📝 测试 ${index + 1}: ${testCase.name}`);
  console.log('输入:');
  console.log(testCase.input);
  
  const result = formatter.format(testCase.input);
  console.log('\n输出:');
  console.log(result);
  
  // 检查是否有标签被截断
  const hyphenatedTags = ['scroll-view', 'swiper-item', 'picker-view', 'picker-view-column', 'cover-view', 'cover-image', 'movable-area', 'movable-view'];
  let hasIssue = false;
  
  hyphenatedTags.forEach(tag => {
    const tagName = tag.split('-')[0]; // 获取连字符前的部分
    if (testCase.input.includes(`<${tag}`) && result.includes(`<${tagName} `) && !result.includes(`<${tag}`)) {
      console.log(`❌ 发现问题：${tag} 被截断为 ${tagName}`);
      hasIssue = true;
    }
  });
  
  if (!hasIssue) {
    console.log('✅ 所有带连字符的标签都保持正确');
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
});

console.log('🎉 所有测试完成！');
