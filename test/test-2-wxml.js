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

// 读取原来的 2.wxml 文件内容
const originalContent = fs.readFileSync('./test/output/2.wxml', 'utf8');

console.log('=== 测试修复后的 2.wxml 格式化 ===\n');
console.log('原始内容:');
console.log(originalContent);
console.log('\n');

// 创建一个包含 scroll-view 的测试内容
const testContent = `<!-- 复杂的WXML示例 -->
<view class="page">
  <view class="header" wx:if="{{showHeader}}">
    <text class="title">{{pageTitle}}</text>
    <button bind:tap="onBack" class="back-btn">返回</button>
  </view>
  <scroll-view class="scroll-view_H" scroll-x="true" scroll-left="{{scrollLeft}}" bindscrolltolower="loadMore">
    <view wx:for="{{dataList}}" wx:key="id" wx:for-item="item" wx:for-index="idx" class="item-container">
      <view class="item-header">
        <text class="item-title">{{item.title}}</text>
        <text wx:if="{{item.isNew}}" class="new-tag">新</text>
      </view>
      <view class="item-content">
        <text class="description">{{item.description}}</text>
        <image wx:if="{{item.imageUrl}}" src="{{item.imageUrl}}" class="item-image" bind:tap="onImageTap" data-url="{{item.imageUrl}}" />
      </view>
      <view class="item-actions">
        <button wx:if="{{item.canEdit}}" bind:tap="onEdit" data-id="{{item.id}}" class="edit-btn">编辑</button>
        <button bind:tap="onDelete" data-id="{{item.id}}" class="delete-btn" wx:if="{{item.canDelete}}">删除</button>
      </view>
      <view wx:if="{{dataList.length === 0}}" class="empty-state">
        <text>暂无数据</text>
      </view>
    </view>
  </scroll-view>
  <view class="footer">
    <button bind:tap="onAdd" class="add-btn">添加新项目</button>
  </view>
</view>`;

const formatter = new WXMLFormatter();
const result = formatter.format(testContent);

console.log('格式化后:');
console.log(result);
console.log('\n');

// 检查是否还有问题
if (result.includes('<scroll ') || result.includes('</scroll>') || (result.includes('<scroll') && !result.includes('<scroll-view'))) {
  console.log('❌ 仍然存在问题：scroll-view 被改为了 scroll');
} else if (result.includes('<scroll-view')) {
  console.log('✅ scroll-view 标签保持正确');
} else {
  console.log('⚠️  未找到 scroll-view 标签');
}

// 保存修复后的结果
fs.writeFileSync('./test/output/2-fixed.wxml', result);
console.log('\n修复后的结果已保存到 ./test/output/2-fixed.wxml');
