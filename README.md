# WXML Formatter

一个专为微信小程序WXML文件设计的VSCode格式化插件。

## 功能特性

- 🎯 **专业WXML格式化** - 专门针对微信小程序WXML文件优化
- 🔧 **完整语法支持** - 支持微信小程序特有的语法（wx:if、wx:for、bind:等）
- 🎨 **表达式保护** - 智能保护双花括号表达式不被破坏（包括复杂嵌套表达式）
- ⚙️ **丰富配置选项** - 提供多种可配置的格式化选项
- 🚀 **多种格式化方式** - 支持右键菜单、快捷键和命令面板格式化
- 📝 **语法高亮** - 完整的WXML语法高亮支持
- 🆕 **智能格式化规则**：
  - 内联标签（`<text>`、`<icon>`等）内容保持同行
  - 自闭合标签（`<image>`、`<input>`等）自动转换为规范格式
  - 可配置的属性换行阈值（默认超过3个属性时换行）
  - 属性对齐和排序功能
  - 清晰的层级缩进结构
  - 支持所有微信小程序组件（包括带连字符的标签）
- 🐛 **稳定可靠** - 修复了带连字符标签被截断的关键问题

## 安装

1. 在VSCode扩展市场搜索 "WXML Formatter"
2. 点击安装
3. 重启VSCode

## 使用方法

### 格式化整个文件
- 使用快捷键 `Shift + Alt + F` (Windows/Linux) 或 `Shift + Option + F` (Mac)
- 或者右键点击编辑器，选择 "Format Document"

### 格式化选中内容
- 选中要格式化的代码
- 使用快捷键 `Ctrl + K, Ctrl + F` (Windows/Linux) 或 `Cmd + K, Cmd + F` (Mac)
- 或者右键点击，选择 "Format Selection"

### 使用命令面板
- 按 `Ctrl + Shift + P` (Windows/Linux) 或 `Cmd + Shift + P` (Mac) 打开命令面板
- 输入 "Format WXML" 并选择

## 配置选项

在VSCode设置中可以配置以下选项：

```json
{
  "wxml-formatter.indentSize": 2,
  "wxml-formatter.maxLineLength": 120,
  "wxml-formatter.preserveNewlines": true,
  "wxml-formatter.wrapAttributes": 3,
  "wxml-formatter.alignAttributes": true,
  "wxml-formatter.sortAttributes": false,
  "wxml-formatter.selfClosingTags": [
    "image", "input", "icon", "video", "audio", "camera",
    "live-player", "live-pusher", "map", "canvas", "web-view",
    "ad", "official-account", "open-data"
  ],
  "wxml-formatter.inlineTags": ["text", "icon", "rich-text"],
  "wxml-formatter.blockTags": [
    "view", "scroll-view", "swiper", "swiper-item", "movable-area",
    "movable-view", "cover-view", "cover-image", "page-container",
    "share-element", "form", "picker", "picker-view", "picker-view-column",
    "slider", "switch", "textarea", "navigator", "functional-page-navigator",
    "live-player", "live-pusher", "map", "canvas", "web-view", "ad",
    "official-account", "open-data", "rich-text", "progress", "button",
    "checkbox", "radio", "label", "editor", "keyboard-accessory",
    "match-media", "page-meta", "navigation-bar", "custom-tab-bar",
    "voip-room", "subscribe", "favorites", "block", "template",
    "import", "include", "wxs", "slot"
  ]
}
```

### 基础配置说明

- `indentSize`: 缩进空格数，默认为2
- `maxLineLength`: 最大行长度，超过此长度会换行，默认为120
- `preserveNewlines`: 是否保留现有的换行符，默认为true

### 高级配置说明

- `wrapAttributes`: 超过多少个属性时换行，默认为3
- `alignAttributes`: 是否对齐属性，默认为true
- `sortAttributes`: 是否按优先级排序属性，默认为false

### 标签配置说明

- `selfClosingTags`: 自闭合标签列表，这些标签会自动转换为自闭合格式
- `inlineTags`: 内联标签列表，这些标签的内容不会换行
- `blockTags`: 块级标签列表，这些标签前后会自动换行

## 支持的WXML语法

- ✅ 微信小程序组件 (view, text, button, image等)
- ✅ 条件渲染 (wx:if, wx:elif, wx:else)
- ✅ 列表渲染 (wx:for, wx:for-item, wx:for-index, wx:key)
- ✅ 事件绑定 (bind:, catch:, capture-bind:, capture-catch:)
- ✅ 双花括号表达式 {{}}
- ✅ 模板语法 (template, import, include)

## 示例

### 基础格式化

**格式化前：**

```xml
<view class="container"><text wx:if="{{show}}">Hello</text><button bind:tap="onTap">Click</button></view>
```

**格式化后：**

```xml
<view class="container"><text wx:if="{{show}}">Hello</text><button bind:tap="onTap">Click</button>
</view>
```

### 带连字符标签格式化（v1.2.2修复）

**格式化前：**

```xml
<scroll-view class="scroll-view_H" scroll-x="true"><swiper-item><picker-view><picker-view-column></picker-view-column></picker-view></swiper-item></scroll-view>
```

**格式化后：**

```xml
<scroll-view class="scroll-view_H" scroll-x="true">
  <swiper-item>
    <picker-view>
      <picker-view-column></picker-view-column>
    </picker-view>
  </swiper-item>
</scroll-view>
```

### 复杂格式化示例

**格式化前：**

```xml
<view class="container"><text wx:if="{{user.isVip}}">VIP用户</text><text wx:elif="{{user.isActive}}">活跃用户</text><text wx:else>普通用户</text><view wx:if="{{showDetails}}"><text>详细信息：{{user.details}}</text><button wx:if="{{canEdit}}" bind:tap="onEdit">编辑</button></view><image src="{{user.avatar}}" class="avatar" mode="aspectFit" bind:tap="onImageTap"></image><button wx:if="{{item.canEdit}}" bind:tap="onEdit" data-id="{{item.id}}" class="edit-btn" disabled="{{loading}}">编辑按钮</button></view>
```

**格式化后：**

```xml
<view class="container"><text wx:if="{{user.isVip}}">VIP用户</text><text wx:elif="{{user.isActive}}">活跃用户</text><text wx:else>普通用户</text>
  <view wx:if="{{showDetails}}"><text>详细信息：{{user.details}}</text><button wx:if="{{canEdit}}" bind:tap="onEdit">编辑</button>
  </view>
  <image src="{{user.avatar}}" class="avatar" mode="aspectFit" bind:tap="onImageTap" />
  <button wx:if="{{item.canEdit}}"
    bind:tap="onEdit"
    data-id="{{item.id}}"
    class="edit-btn"
    disabled="{{loading}}">编辑按钮</button>
</view>
```

### 格式化规则说明

- ✅ `<text>` 标签内容保持在同一行
- ✅ `<image>` 标签自动转换为自闭合格式
- ✅ 属性超过3个时自动换行
- ✅ 清晰的层级缩进结构
- ✅ 正确处理带连字符的标签（如 `scroll-view`、`swiper-item` 等）

## 版本历史

### v1.2.2 (2025-07-21) - 重要修复版本

- 🐛 **重要修复**: 修复带连字符标签被截断的问题
  - 修复 `<scroll-view>` 被错误截断为 `<scroll>` 的问题
  - 修复 `<swiper-item>` 被错误截断为 `<swiper>` 的问题
  - 修复所有微信小程序带连字符标签的处理问题
- 🔧 修复了格式化器中12处正则表达式
- ✅ 新增专门的带连字符标签测试用例

### v1.2.0 (2025-07-20) - 功能增强版本

- 🆕 增强的格式化规则：复杂嵌套表达式处理、可配置属性换行阈值
- ⚙️ 丰富的配置选项：属性对齐、排序、自定义标签列表
- 🔧 优化双花括号表达式保护机制
- 📝 扩展的测试用例

### v1.1.0 (2025-07-20) - 智能格式化版本

- 🆕 智能格式化规则：`<text>` 标签内容保持同行、`<image>` 标签自闭合
- 📝 完善的测试套件
- 🚀 提升格式化性能

### v1.0.0 (2025-07-20) - 初始版本

- 初始版本发布
- 支持基本的WXML格式化功能
- 支持微信小程序特有语法
- 可配置的格式化选项

## 问题反馈

如果您遇到任何问题或有功能建议，请在GitHub上提交issue。

## 许可证

MIT License
