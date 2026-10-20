# WXML Formatter

专为微信小程序 **WXML** 设计的 VS Code 格式化扩展。

当前版本：**1.3.5**

## 功能特性

- **专业 WXML 格式化**：针对小程序模板语法优化，不是通用 HTML 美化
- **完整语法支持**：`wx:if` / `wx:for` / `bind:` / `catch:` / `capture-*` 等
- **表达式保护**：`{{ }}` 与指令名先占位保护，格式化后再还原，避免被拆坏
- **智能换行规则**：
  - 属性数 ≥ `wrapAttributes`（默认 3）时属性换行
  - 或开始标签原始长度 > 100 时属性换行
  - `<text>` 等多属性换行时，文本内容与 `</text>` 仍保持同行
  - 属性较少且未超长时，内联标签保持单行
- **自闭合规范化**：`image` / `input` 等可配置标签统一为 `/>` 形式
- **多种触发方式**：文档格式化、选区格式化、命令面板 `Format WXML`
- **性能优化（1.3.5）**：静态正则复用、自闭合合并扫描、配置缓存、无特征短路径跳过

## 安装

### 扩展市场

1. VS Code 扩展市场搜索 `WXML Formatter`
2. 安装后重新加载窗口（如需要）

### 本地 VSIX

```powershell
code --install-extension E:\path\to\wxml-formatter-1.3.5.vsix
```

或在扩展视图 → `...` → **从 VSIX 安装**。

## 使用方法

### 格式化整个文件

- 快捷键：`Shift + Alt + F`（Windows/Linux）/ `Shift + Option + F`（Mac）
- 右键 → **Format Document**
- 命令面板 → `Format WXML`

### 格式化选中内容

- 快捷键：`Ctrl + K Ctrl + F`（Windows/Linux）/ `Cmd + K Cmd + F`（Mac）
- 右键 → **Format Selection**

> 提示：请将 `.wxml` 的默认格式化器指定为本扩展（如被其他格式化器抢占时）。

## 配置选项

在 VS Code 设置中搜索 `wxml-formatter`，或写入 `settings.json`：

```json
{
  "wxml-formatter.indentSize": 2,
  "wxml-formatter.wrapAttributes": 3,
  "wxml-formatter.selfClosingTags": [
    "image",
    "input",
    "icon",
    "video",
    "audio",
    "camera",
    "live-player",
    "live-pusher",
    "map",
    "canvas",
    "web-view",
    "ad",
    "official-account",
    "open-data"
  ],
  "wxml-formatter.inlineTags": ["text", "icon", "rich-text"]
}
```

### 当前生效配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `indentSize` | `2` | 缩进空格数 |
| `wrapAttributes` | `3` | 属性数达到该值时换行 |
| `selfClosingTags` | 见上表默认列表 | 规范为自闭合的标签 |
| `inlineTags` | `text` / `icon` / `rich-text` | 内容尽量与标签同行 |

额外硬编码阈值（暂不做成配置）：

- 开始标签长度 > **100** 时强制属性换行
- 非内联标签短文本内容 ≤ **50** 字符时尽量保持单行

### 当前未生效配置（设置面板仍可见）

以下项在 `package.json` 中保留声明，但 **1.3.4+ 运行时不再读取**，修改不会影响输出（计划后续实现）：

- `maxLineLength`
- `preserveNewlines`
- `alignAttributes`
- `sortAttributes`
- `blockTags`

## 支持的 WXML 语法

- 微信小程序组件（`view`、`text`、`button`、`image`、带连字符标签等）
- 条件渲染：`wx:if` / `wx:elif` / `wx:else`
- 列表渲染：`wx:for` / `wx:for-item` / `wx:for-index` / `wx:key`
- 事件绑定：`bind:` / `catch:` / `capture-bind:` / `capture-catch:`
- 双花括号表达式：`{{ }}`（含嵌套三元等）
- 模板相关：`template` / `import` / `include` / `wxs` / `slot`
- 布尔属性：`disabled` / `required` 等（无值属性保留）

## 示例

### 基础格式化

**前：**

```xml
<view class="container"><text wx:if="{{show}}">Hello World</text><button bind:tap="onTap" class="btn">Click Me</button></view>
```

**后：**

```xml
<view class="container">
  <text wx:if="{{show}}">Hello World</text>
  <button bind:tap="onTap" class="btn">Click Me</button>
</view>
```

### 多属性换行

**前：**

```xml
<button class="btn" style="color: red;" bind:tap="onTap" data-id="{{item.id}}" data-type="{{item.type}}" disabled="{{loading}}">提交</button>
```

**后：**

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

### text 多属性仍保持内容同行

**前：**

```xml
<text class="title" data-id="123" bind:tap="handleTap" style="color:red">这是文本内容</text>
```

**后：**

```xml
<text
  class="title"
  data-id="123"
  bind:tap="handleTap"
  style="color:red"
>这是文本内容</text>
```

### 自闭合标签

**前：**

```xml
<image src="{{avatar}}" mode="aspectFit"></image>
```

**后：**

```xml
<image src="{{avatar}}" mode="aspectFit" />
```

## 架构说明（开发者）

```text
src/
  defaults.ts      # 默认配置与阈值常量
  format-core.ts   # 纯格式化核心 formatWxml（不依赖 vscode）
  formatter.ts     # 读取 VS Code 配置并委托核心
  extension.ts     # 命令 / DocumentFormatting / RangeFormatting 注册
```

主流程：

1. 按顺序记录开始标签原始长度  
2. 保护 `{{ }}` 与指令名  
3. 规范化自闭合标签  
4. Tokenize → 重建缩进文档  
5. 还原占位 → 收尾清理  

## 开发与验证

```powershell
# 安装依赖
npm install

# 编译 TypeScript（输出到 out/）
npm run compile

# 跑单元测试（会先 compile）
npm test

# 性能微基准（合成大文件多次 format）
npm run bench

# Webpack 打包扩展入口（dist/）
npm run compile-web

# 打 VSIX 包
npm run package
```

## 版本要点

- **1.3.5**：格式化热路径性能优化（静态正则、合并扫描、配置缓存等）
- **1.3.4**：纯核心拆分、标签长度阈值修复、测试与生产共用实现、移除 `js-beautify`
- 更早变更见 [CHANGELOG.md](./CHANGELOG.md)

## 常见问题

**Q: 格式化没生效？**  
A: 确认文件扩展名是 `.wxml`，并检查是否被其他格式化扩展覆盖默认格式化器。

**Q: 改了 `blockTags` / `maxLineLength` 没变化？**  
A: 这些配置当前未接入运行时，见上文「未生效配置」。

**Q: 会不会接管语法高亮？**  
A: 不会。本扩展只做格式化，不抢 WXML 高亮，避免与其他高亮插件冲突。

## 许可证

见 [LICENSE](./LICENSE)。

## 反馈

- Issues：<https://github.com/60liulin60/formatter-wxml/issues>
- 仓库：<https://github.com/60liulin60/formatter-wxml>