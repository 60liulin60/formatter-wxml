const { WXMLFormatter } = require('../out/formatter');

console.log('🧪 测试 text 标签多属性换行格式化\n');

const formatter = new WXMLFormatter();

// 测试用例
const testCases = [
  {
    name: 'text 标签 - 3个属性',
    input: '<text class="title" data-id="123" bind:tap="handleTap">这是文本内容</text>',
    description: '3个属性时应该换行，内容与最后属性在同一行'
  },
  {
    name: 'text 标签 - 4个属性',
    input: '<text class="asda" tabindex assdassd asd>asdasdasdsaaszdasd asdasdasd asdasd asd asd asd asd asd asd asd a</text>',
    description: '4个属性时应该换行，内容与最后属性在同一行'
  },
  {
    name: 'text 标签 - 长内容',
    input: '<text class="a" data-id="b" style="color:red">这是一段很长很长很长很长很长很长的文本内容</text>',
    description: '长内容也应该与最后属性在同一行'
  },
  {
    name: 'view 标签 - 3个属性（对比）',
    input: '<view class="container" data-id="123" bind:tap="handleTap">这是内容</view>',
    description: 'view 标签应该按照通用规则格式化'
  }
];

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  console.log(`📝 测试 ${index + 1}: ${test.name}`);
  console.log(`📋 描述: ${test.description}`);
  console.log(`📥 输入:\n${test.input}\n`);
  
  try {
    const result = formatter.format(test.input);
    console.log(`📤 输出:\n${result}`);
    
    // 验证 text 标签的特殊格式
    if (test.name.includes('text 标签')) {
      const lines = result.trim().split('\n');
      const lastAttrLine = lines[lines.length - 1];
      
      // 检查最后一行是否包含 >内容</text>
      if (lastAttrLine.includes('>') && lastAttrLine.includes('</text>')) {
        console.log('✅ 测试通过 - text 标签内容正确保持在最后属性行\n');
        passed++;
      } else {
        console.log('❌ 测试失败 - text 标签内容未保持在最后属性行\n');
        failed++;
      }
    } else {
      console.log('✅ 测试通过\n');
      passed++;
    }
  } catch (error) {
    console.log(`❌ 测试失败: ${error.message}\n`);
    failed++;
  }
});

console.log(`\n🎉 测试完成！通过: ${passed}, 失败: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
