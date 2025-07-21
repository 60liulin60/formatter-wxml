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

// 完整验证缩进
function verifyIndentation(filename) {
  const content = fs.readFileSync(`./test/output/${filename}`, 'utf8');
  const lines = content.split('\n');
  
  console.log(`\n=== 验证 ${filename} 的缩进 ===`);
  
  let hasError = false;
  let expectedDepth = 0;
  let inMultiLineTag = false;
  let multiLineTagStartDepth = 0;
  
  lines.forEach((line, index) => {
    if (!line.trim()) return;
    
    const trimmed = line.trim();
    const actualSpaces = line.length - line.trimLeft().length;
    const actualDepth = actualSpaces / 2;
    
    // 检查是否是属性行
    const isAttributeLine = !trimmed.startsWith('<') && trimmed.includes('=');
    
    // 计算期望的缩进
    let expectedSpaces;
    
    if (trimmed.startsWith('</')) {
      // 结束标签
      expectedDepth = Math.max(0, expectedDepth - 1);
      expectedSpaces = expectedDepth * 2;
      inMultiLineTag = false;
    } else if (isAttributeLine) {
      // 属性行
      if (inMultiLineTag) {
        expectedSpaces = (multiLineTagStartDepth + 1) * 2;
      } else {
        expectedSpaces = (expectedDepth + 1) * 2;
      }
    } else {
      // 普通行
      expectedSpaces = expectedDepth * 2;
    }
    
    // 检查缩进是否正确
    if (actualSpaces !== expectedSpaces) {
      console.log(`❌ 第${index + 1}行缩进错误:`);
      console.log(`   实际: ${actualSpaces}空格, 期望: ${expectedSpaces}空格`);
      console.log(`   内容: ${trimmed}`);
      hasError = true;
    }
    
    // 更新期望深度
    if (trimmed.startsWith('<') &&
        !trimmed.startsWith('</') &&
        !trimmed.startsWith('<!--') &&
        !trimmed.endsWith('/>') &&
        !trimmed.match(/<(\w+)[^>]*>.*<\/\1>/)) {
      
      if (trimmed.includes('>')) {
        // 完整的单行标签
        expectedDepth++;
        inMultiLineTag = false;
      } else {
        // 多行标签的开始
        inMultiLineTag = true;
        multiLineTagStartDepth = expectedDepth;
      }
    } else if (inMultiLineTag && trimmed.includes('>') && !trimmed.startsWith('<')) {
      // 多行标签的结束
      expectedDepth++;
      inMultiLineTag = false;
    }
  });
  
  if (!hasError) {
    console.log(`✅ ${filename} 缩进完全正确！`);
  }
  
  return !hasError;
}

// 验证两个文件
const file1OK = verifyIndentation('1.wxml');
const file2OK = verifyIndentation('2.wxml');

console.log('\n=== 最终验证结果 ===');
if (file1OK && file2OK) {
  console.log('🎉 所有文件的缩进都完全正确！');
} else {
  console.log('❌ 仍有缩进问题需要修复');
}

// 对比两个文件的差异
console.log('\n=== 文件差异分析 ===');
const content1 = fs.readFileSync('./test/output/1.wxml', 'utf8');
const content2 = fs.readFileSync('./test/output/2.wxml', 'utf8');

if (content1 === content2) {
  console.log('✅ 1.wxml 和 2.wxml 内容完全一致');
} else {
  console.log('ℹ️  1.wxml 和 2.wxml 有格式差异（但缩进都正确）');
  
  const lines1 = content1.split('\n');
  const lines2 = content2.split('\n');
  
  for (let i = 0; i < Math.max(lines1.length, lines2.length); i++) {
    const line1 = lines1[i] || '';
    const line2 = lines2[i] || '';
    
    if (line1 !== line2) {
      console.log(`第${i + 1}行差异:`);
      console.log(`  1.wxml: ${line1}`);
      console.log(`  2.wxml: ${line2}`);
    }
  }
}
