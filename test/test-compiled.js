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

// 注入到全局
global.vscode = vscode;

// 现在可以安全地导入编译后的模块
const { WXMLFormatter } = require('../out/formatter.js');

// 测试
const formatter = new WXMLFormatter();
const input = fs.readFileSync('./test/examples/complex.wxml', 'utf8');
const output = formatter.format(input);
fs.writeFileSync('./test/output/1.wxml', output);
console.log('已更新 1.wxml');
console.log('格式化结果:');
console.log(output);
