const fs = require('fs');
const path = require('path');

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
          'selfClosingTags': ['image', 'input', 'icon', 'video', 'audio', 'camera', 'live-player', 'live-pusher', 'map', 'canvas', 'web-view', 'ad', 'official-account', 'open-data'],
          'inlineTags': ['text', 'icon', 'rich-text'],
          'blockTags': [
            'view', 'scroll-view', 'swiper', 'swiper-item', 'movable-area', 'movable-view',
            'cover-view', 'cover-image', 'page-container', 'share-element',
            'form', 'picker', 'picker-view', 'picker-view-column', 'slider', 'switch', 'textarea',
            'navigator', 'functional-page-navigator', 'live-player', 'live-pusher',
            'map', 'canvas', 'web-view', 'ad', 'official-account', 'open-data',
            'rich-text', 'progress', 'button', 'checkbox', 'radio', 'label',
            'editor', 'keyboard-accessory', 'match-media', 'page-meta', 'navigation-bar',
            'custom-tab-bar', 'voip-room', 'subscribe', 'favorites', 'block', 'template',
            'import', 'include', 'wxs', 'slot'
          ]
        };
        return config[key] !== undefined ? config[key] : defaultValue;
      }
    })
  }
};

global.vscode = vscode;

// 导入格式化器
const { WXMLFormatter } = require('./out/formatter.js');

function formatOutputFiles() {
  const formatter = new WXMLFormatter();
  const outputDir = path.join(__dirname, 'test', 'output');
  
  console.log('🚀 开始格式化 output 目录下的所有 WXML 文件...\n');
  
  // 检查输出目录是否存在
  if (!fs.existsSync(outputDir)) {
    console.log('❌ output 目录不存在');
    return;
  }
  
  // 读取所有 .wxml 文件
  const files = fs.readdirSync(outputDir).filter(file => file.endsWith('.wxml'));
  
  if (files.length === 0) {
    console.log('📁 output 目录中没有找到 .wxml 文件');
    return;
  }
  
  console.log(`📁 找到 ${files.length} 个 WXML 文件:`);
  files.forEach(file => console.log(`   - ${file}`));
  console.log('');
  
  let successCount = 0;
  let errorCount = 0;
  
  // 格式化每个文件
  files.forEach(file => {
    const filePath = path.join(outputDir, file);
    
    try {
      console.log(`📝 正在格式化: ${file}`);
      
      // 读取原始内容
      const originalContent = fs.readFileSync(filePath, 'utf8');
      console.log(`   📏 原始文件大小: ${originalContent.length} 字符`);
      
      // 格式化内容
      const formattedContent = formatter.format(originalContent);
      console.log(`   📏 格式化后大小: ${formattedContent.length} 字符`);
      
      // 检查是否有变化
      if (originalContent === formattedContent) {
        console.log(`   ✅ ${file} - 已经是正确格式，无需修改`);
      } else {
        // 写回文件
        fs.writeFileSync(filePath, formattedContent);
        console.log(`   ✅ ${file} - 格式化完成并已保存`);
      }
      
      successCount++;
      
    } catch (error) {
      console.log(`   ❌ ${file} - 格式化失败: ${error.message}`);
      errorCount++;
    }
    
    console.log('');
  });
  
  // 输出总结
  console.log('=' .repeat(50));
  console.log('📊 格式化完成统计:');
  console.log(`   ✅ 成功: ${successCount} 个文件`);
  console.log(`   ❌ 失败: ${errorCount} 个文件`);
  console.log(`   📁 总计: ${files.length} 个文件`);
  
  if (errorCount === 0) {
    console.log('\n🎉 所有文件格式化成功！');
  } else {
    console.log('\n⚠️  部分文件格式化失败，请检查错误信息');
  }
}

// 如果直接运行此文件，则执行格式化
if (require.main === module) {
  formatOutputFiles();
}

module.exports = { formatOutputFiles };
