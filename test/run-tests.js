const fs = require('fs');
const path = require('path');
const { WXMLFormatter, runTests } = require('./formatter.test');

// 文件测试运行器
function runFileTests() {
    const formatter = new WXMLFormatter();
    const examplesDir = path.join(__dirname, 'examples');
    const outputDir = path.join(__dirname, 'output');
    
    // 创建输出目录
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log('📁 开始运行文件测试...\n');
    
    // 读取所有示例文件
    const exampleFiles = fs.readdirSync(examplesDir).filter(file => file.endsWith('.wxml'));
    
    exampleFiles.forEach(file => {
        const filePath = path.join(examplesDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const fileName = path.basename(file, '.wxml');
        
        console.log(`📝 测试文件: ${file}`);
        console.log('📥 原始内容:');
        console.log(content.substring(0, 100) + (content.length > 100 ? '...' : ''));
        
        try {
            const formatted = formatter.format(content);
            console.log('📤 格式化后:');
            console.log(formatted.substring(0, 200) + (formatted.length > 200 ? '...' : ''));
            
            // 保存格式化结果
            const outputFile = path.join(outputDir, `${fileName}-formatted.wxml`);
            fs.writeFileSync(outputFile, formatted);
            console.log(`💾 结果已保存到: ${outputFile}`);
            
            console.log('✅ 文件测试通过\n');
        } catch (error) {
            console.log(`❌ 文件测试失败: ${error.message}\n`);
        }
    });
}

// 性能测试
function runPerformanceTests() {
    const formatter = new WXMLFormatter();
    console.log('⚡ 开始性能测试...\n');
    
    // 生成大型WXML内容
    const largeContent = generateLargeWXML();
    
    console.log(`📊 测试内容大小: ${largeContent.length} 字符`);
    
    const startTime = Date.now();
    const formatted = formatter.format(largeContent);
    const endTime = Date.now();
    
    const duration = endTime - startTime;
    console.log(`⏱️  格式化耗时: ${duration}ms`);
    console.log(`📈 处理速度: ${Math.round(largeContent.length / duration)} 字符/ms`);
    
    // 保存性能测试结果
    const outputDir = path.join(__dirname, 'output');
    fs.writeFileSync(path.join(outputDir, 'performance-test.wxml'), formatted);
    console.log('💾 性能测试结果已保存\n');
}

// 生成大型WXML内容用于性能测试
function generateLargeWXML() {
    const template = `
    <view class="item-{{index}}" wx:for="{{items}}" wx:key="id" wx:for-item="item" wx:for-index="index">
        <view class="header">
            <text class="title">{{item.title}}</text>
            <text wx:if="{{item.isNew}}" class="tag">新</text>
        </view>
        <view class="content">
            <text>{{item.description}}</text>
            <image wx:if="{{item.image}}" src="{{item.image}}" bind:tap="onImageTap"/>
        </view>
        <view class="actions">
            <button wx:if="{{item.canEdit}}" bind:tap="onEdit" data-id="{{item.id}}">编辑</button>
            <button bind:tap="onDelete" data-id="{{item.id}}">删除</button>
        </view>
    </view>`;
    
    // 重复模板100次
    return '<view class="container">' + template.repeat(100) + '</view>';
}

// 主测试函数
function main() {
    console.log('🚀 WXML格式化器测试套件\n');
    console.log('=' .repeat(50));
    
    // 运行单元测试
    runTests();
    
    console.log('=' .repeat(50));
    
    // 运行文件测试
    runFileTests();
    
    console.log('=' .repeat(50));
    
    // 运行性能测试
    runPerformanceTests();
    
    console.log('🎉 所有测试完成！');
    console.log(`📁 测试结果保存在: ${path.join(__dirname, 'output')}`);
}

// 如果直接运行此文件，则执行主测试
if (require.main === module) {
    main();
}

module.exports = { runFileTests, runPerformanceTests, main };
