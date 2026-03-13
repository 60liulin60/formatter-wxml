# WXML Formatter

一个专为微信小程序WXML文件设计的VSCode格式化插件。

## 功能特性

- 🎯 **专业WXML格式化** - 专门针对微信小程序WXML文件优化
- 🔧 **完整语法支持** - 支持微信小程序特有的语法（wx:if、wx:for、bind:等）
- 🎨 **表达式保护** - 智能保护双花括号表达式不被破坏（包括复杂嵌套表达式）
- ⚙️ **基础配置选项** - 提供核心格式化配置选项
- 🚀 **多种格式化方式** - 支持右键菜单、快捷键和命令面板格式化
- 🆕 **智能格式化规则**：
  - 内联标签（`<text>`、`<icon>`等）内容保持同行
  - `<text>` 标签阈值规则：属性数 >= 3 或开始标签长度 > 100 时才多行格式化，否则保持单行
  - 自闭合标签（`<image>`、`<input>`等）自动转换为规范格式
  - 可配置的属性换行阈值（默认超过3个属性时换行）
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
  "wxml-formatter.wrapAttributes": 3,
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
- `wrapAttributes`: 超过多少个属性时换行，默认为3
  - 当属性数量 >= 3 时，自动换行
  - 或当标签长度 > 100 字符时，也会自动换行

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
- ✅ 布尔属性 (disabled, required, showBtn 等)

## 示例

### 基础格式化

**格式化前：**

```xml
<view class="container"><text wx:if="{{show}}">Hello World</text><button bind:tap="onTap" class="btn">Click Me</button></view>
```

**格式化后：**

```xml
<view class="container">
  <text wx:if="{{show}}">Hello World</text>
  <button bind:tap="onTap" class="btn">Click Me</button>
</view>
```

### 条件渲染格式化

**格式化前：**

```xml
<view><text wx:if="{{condition}}">显示文本</text><text wx:elif="{{other}}">其他文本</text><text wx:else>默认文本</text></view>
```

**格式化后：**

```xml
<view>
  <text wx:if="{{condition}}">显示文本</text>
  <text wx:elif="{{other}}">其他文本</text>
  <text wx:else>默认文本</text>
</view>
```

### 列表渲染格式化

**格式化前：**

```xml
<view wx:for="{{list}}" wx:key="id" wx:for-item="item" wx:for-index="index"><text>{{item.name}}</text></view>
```

**格式化后：**

```xml
<view
  wx:for="{{list}}"
  wx:key="id"
  wx:for-item="item"
  wx:for-index="index"
>
  <text>{{item.name}}</text>
</view>
```

### 事件绑定格式化

**格式化前：**

```xml
<button bind:tap="onTap" catch:touchstart="onTouch" capture-bind:longpress="onLongPress">按钮</button>
```

**格式化后：**

```xml
<button
  bind:tap="onTap"
  catch:touchstart="onTouch"
  capture-bind:longpress="onLongPress"
>
  按钮
</button>
```

### 双花括号表达式保护

**格式化前：**

```xml
<text>{{user.name + " - " + user.age}}</text><view class="{{isActive ? 'active' : 'inactive'}}">内容</view>
```

**格式化后：**

```xml
<text>{{user.name + " - " + user.age}}</text>
<view class="{{isActive ? 'active' : 'inactive'}}">内容</view>
```

### 复杂嵌套表达式

**格式化前：**

```xml
<view class="{{item.status === 'active' ? (item.type === 'vip' ? 'vip-active' : 'normal-active') : 'inactive'}}"><text>{{item.data && item.data.user ? item.data.user.name : '未知用户'}}</text></view>
```

**格式化后：**

```xml
<view
  class="{{item.status === 'active' ? (item.type === 'vip' ? 'vip-active' : 'normal-active') : 'inactive'}}"
>
  <text>{{item.data && item.data.user ? item.data.user.name : '未知用户'}}</text>
</view>
```

### 自闭合标签格式化

**格式化前：**

```xml
<view><image src="{{avatar}}" mode="aspectFit"></image><input type="text" placeholder="请输入"></input><icon type="success" size="20"></icon></view>
```

**格式化后：**

```xml
<view>
  <image src="{{avatar}}" mode="aspectFit" />
  <input type="text" placeholder="请输入" />
  <icon type="success" size="20" />
</view>
```

### 多属性标签换行

**格式化前：**

```xml
<button class="btn" style="color: red;" bind:tap="onTap" data-id="{{item.id}}" data-type="{{item.type}}" disabled="{{loading}}">提交</button>
```

**格式化后：**

```xml
<button
  class="btn"
  style="color: red;"
  bind:tap="onTap"
  data-id="{{item.id}}"
  data-type="{{item.type}}"
  disabled="{{loading}}"
>
  提交
</button>
```

### 微信小程序组件

**格式化前：**

```xml
<scroll-view scroll-y="true" class="scroll-area"><swiper indicator-dots="{{true}}" autoplay="{{false}}" interval="{{5000}}"><swiper-item><image src="{{item.url}}" mode="aspectFill"></image></swiper-item></swiper></scroll-view>
```

**格式化后：**

```xml
<scroll-view scroll-y="true" class="scroll-area">
  <swiper
    indicator-dots="{{true}}"
    autoplay="{{false}}"
    interval="{{5000}}"
  >
    <swiper-item>
      <image src="{{item.url}}" mode="aspectFill" />
    </swiper-item>
  </swiper>
</scroll-view>
```

### 布尔属性保留

**格式化前：**

```xml
<input type="text" disabled required placeholder="请输入" maxlength="100" />
```

**格式化后：**

```xml
<input
  type="text"
  disabled
  required
  placeholder="请输入"
  maxlength="100" />
```

### 长标签换行

**格式化前：**

```xml
<view class="very-long-class-name-that-makes-the-tag-exceed-100-characters" data-id="12345" style="color: red;">内容</view>
```

**格式化后：**

```xml
<view
  class="very-long-class-name-that-makes-the-tag-exceed-100-characters"
  data-id="12345"
  style="color: red;"
>
  内容
</view>
```

### text 标签阈值格式化示例

**格式化前（少于3个属性且长度 <= 100）：**

```xml
<text class="tip-wrap cashback-wrap">限时奖励</text>
```

**格式化后（保持单行）：**

```xml
<text class="tip-wrap cashback-wrap">限时奖励</text>
```

**格式化前（>=3 个属性）：**

```xml
<text class="title" data-id="123" bind:tap="handleTap" style="color:red">这是文本内容</text>
```

**格式化后（多行，> 独立一行，内容与 </text> 同行）：**

```xml
<text
  class="title"
  data-id="123"
  bind:tap="handleTap"
  style="color:red">这是文本内容</text>
```

### 布尔属性示例

**格式化前：**

```xml
<input type="text" disabled required placeholder="请输入" maxlength="100" />
```

**格式化后：**

```xml
<input
  type="text"
  disabled
  required
  placeholder="请输入"
  maxlength="100" />
```

### 长标签换行示例

**格式化前：**

```xml
<view class="very-long-class-name-that-makes-the-tag-exceed-100-characters" data-id="12345" style="color: red;">内容</view>
```

**格式化后：**

```xml
<view
  class="very-long-class-name-that-makes-the-tag-exceed-100-characters"
  data-id="12345"
  style="color: red;">
  内容
</view>
```

### 格式化规则说明

- ✅ `<text>` 标签内容保持在同一行（少于3个属性且长度 <= 100 时保持单行）
- ✅ `<text>` 标签阈值规则：属性数 >= 3 或开始标签长度 > 100 时多行格式化
- ✅ `<image>` 标签自动转换为自闭合格式
- ✅ 属性数 >= 3 或标签长度超过 100 字符时自动换行
- ✅ 布尔属性（如 `disabled`、`showBtn`）正确保留
- ✅ 清晰的层级缩进结构
- ✅ 正确处理带连字符的标签（如 `scroll-view`、`swiper-item` 等）

## 版本历史

### v1.3.2 (2026-01-23) - 体验优化版本

- 🎯 **优化**: text 标签采用阈值规则，避免过度换行
  - 仅当属性数 >= 3 或开始标签长度 > 100 时才多行格式化
  - 否则保持单行，提升可读性
  - 示例：`<text class="tip-wrap cashback-wrap">限时奖励</text>` 保持单行
- 🔧 **修复**: 代码高亮冲突问题
  - 移除本插件对 WXML 语法高亮的接管
  - 改用基于文件扩展名（.wxml）的格式化注册
  - 可与其他高亮插件共存，不再导致高亮丢失
- 📝 **测试**: 新增 text 标签阈值测试用例，18 个测试全部通过

### v1.3.1 (2025-12-30) - 修复版本

- 🐛 **修复**: text 标签在多属性换行时内容被错误换行的问题
  - text 标签的文本内容现在始终与最后一个属性的 `>` 保持在同一行
  - 结束标签 `</text>` 也保持在同一行
  - 格式示例：
    ```xml
    <text
      class="title"
      data-id="123"
      bind:tap="handleTap">这是文本内容</text>
    ```
- ✨ **改进**: 为 text 标签添加专门的格式化逻辑
- 🎯 **优化**: text 标签的特殊处理优先于通用的多属性换行规则

### v1.3.0 (2025-12-30) - 重大优化版本

- 🚀 **性能优化**: 代码量减少 80%（从 1335 行优化到 ~260 行）
- 🏗️ **架构重构**: 采用 Token 化解析 + 文档重建的清晰架构
- 🐛 **修复**: 多属性标签（>3 个属性）正确换行显示
- 🐛 **修复**: 短文本标签（如 `<view>页面1</view>`）保持同行
- ✨ **改进**: 消除重复代码，提升可维护性
- ✨ **改进**: 优化属性解析，支持占位符格式
- ✨ **新增**: 支持布尔属性（disabled、required、showBtn 等）
- ✨ **新增**: 换行逻辑优化 - 属性数量 > 3 或标签长度 > 100 时换行
- 📝 **测试**: 同步更新测试文件，14 个测试用例全部通过

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
