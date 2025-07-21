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
            'navigator', 'picker', 'picker-view', 'slider', 'switch', 'textarea'
          ]
        };
        return config[key] !== undefined ? config[key] : defaultValue;
      }
    })
  }
};

global.vscode = vscode;
const { WXMLFormatter } = require('./out/formatter.js');

// 测试用例：包含 scroll-view 标签的 WXML
const testInput = `<view class="page">
  <scroll-view class="scroll-view_H" scroll-x="true" scroll-left="{{scrollLeft}}" bindscrolltolower="loadMore">
    <view wx:for="{{dataList}}" wx:key="id" class="item">
      <text>{{item.name}}</text>
    </view>
  </scroll-view>
</view>`;

console.log('=== 测试 scroll-view 标签格式化问题 ===\n');
console.log('输入:');
console.log(testInput);
console.log('\n');

const formatter = new WXMLFormatter();
const result = formatter.format(testInput);

console.log('输出:');
console.log(result);
console.log('\n');

// 检查是否存在问题
if (result.includes('<scroll ') || result.includes('</scroll>') || (result.includes('<scroll') && !result.includes('<scroll-view'))) {
  console.log('❌ 发现问题：scroll-view 被改为了 scroll');
  
  // 分析可能的原因
  console.log('\n=== 问题分析 ===');
  
  // 检查是否是 js-beautify 的问题
  const { html: beautifyHtml } = require('js-beautify');
  const beautifyOptions = {
    indent_size: 2,
    indent_char: ' ',
    max_preserve_newlines: 2,
    preserve_newlines: true,
    keep_array_indentation: false,
    break_chained_methods: false,
    indent_scripts: 'keep',
    indent_styles: 'keep',
    space_before_conditional: true,
    unescape_strings: false,
    jslint_happy: false,
    end_with_newline: true,
    wrap_line_length: 120,
    indent_inner_html: false,
    comma_first: false,
    e4x: false,
    indent_empty_lines: false
  };
  
  const beautifyResult = beautifyHtml(testInput, beautifyOptions);
  console.log('js-beautify 直接处理结果:');
  console.log(beautifyResult);
  
  if (beautifyResult.includes('<scroll ') || beautifyResult.includes('</scroll>')) {
    console.log('问题来源：js-beautify 库本身将 scroll-view 改为了 scroll');
  } else {
    console.log('问题来源：WXML 格式化器的后处理逻辑');
  }

  // 进一步测试各个处理阶段
  console.log('\n=== 各阶段处理结果 ===');

  // 测试预处理阶段
  const preprocessed = formatter.preprocessWXML(testInput);
  console.log('预处理后:');
  console.log(preprocessed);

  // 测试 js-beautify 处理后
  const beautified = beautifyHtml(preprocessed, beautifyOptions);
  console.log('\njs-beautify 处理后:');
  console.log(beautified);

  // 测试后处理阶段
  formatter._expressions = [];
  formatter._directives = [];
  const postprocessed = formatter.postprocessWXML(beautified);
  console.log('\n后处理后:');
  console.log(postprocessed);
  
} else if (result.includes('<scroll-view')) {
  console.log('✅ scroll-view 标签保持正确');
} else {
  console.log('⚠️  未找到 scroll-view 标签，可能被完全删除或修改');
}

// 保存结果用于进一步分析
fs.writeFileSync('./test/output/scroll-view-test.wxml', result);
console.log('\n结果已保存到 ./test/output/scroll-view-test.wxml');
