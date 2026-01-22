const fs = require('fs');
const path = require('path');

// 模拟 vscode 配置
global.vscode = {
  workspace: {
    getConfiguration: () => ({
      get: (key, defaultValue) => defaultValue
    })
  }
};

const { WXMLFormatter } = require('../out/formatter.js');

const testCase = `<view class="direction-list"><view wx:for="{{directionList}}" wx:key="index" class="direction-item {{item.selected ? 'active' : ''}}" catch:tap="onSelectDirection" data-index="{{index}}">{{item}}</view></view>`;

console.log('📥 输入:');
console.log(testCase);
console.log('\n📤 输出:');

const formatter = new WXMLFormatter();
const result = formatter.format(testCase);
console.log(result);

// 保存结果
const outputPath = path.join(__dirname, 'output', 'test-direction-list.wxml');
fs.writeFileSync(outputPath, result, 'utf8');
console.log(`\n💾 结果已保存到: ${outputPath}`);
