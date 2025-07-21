const fs = require('fs');
const vscode = {
  workspace: {
    getConfiguration: (section) => ({
      get: (key, defaultValue) => {
        const config = {
          'indentSize': 2,
          'maxLineLength': 120,
          'preserveNewlines': true,
          'wrapAttributes': 4,
          'alignAttributes': true,
          'sortAttributes': false,
          'selfClosingTags': ['image', 'input', 'icon'],
          'inlineTags': ['text', 'icon'],
          'blockTags': ['view', 'scroll-view', 'swiper', 'swiper-item', 'form', 'button', 'navigator', 'picker', 'picker-view', 'slider', 'switch', 'textarea']
        };
        return config[key] !== undefined ? config[key] : defaultValue;
      }
    })
  }
};
global.vscode = vscode;
const { WXMLFormatter } = require('./out/formatter.js');
const formatter = new WXMLFormatter();
const input = fs.readFileSync('./test/examples/complex.wxml', 'utf8');
const output = formatter.format(input);
fs.writeFileSync('./test/output/2.wxml', output);
console.log('已更新 2.wxml');
