# WXML Formatter

专为微信小程序 **WXML** 设计的 VS Code 格式化扩展。

当前版本：**1.3.5** · 零运行时依赖 · 22 个格式化用例（含幂等校验）

## 功能特性

- **专业 WXML 格式化**：针对小程序模板语法优化，不是通用 HTML 美化
- **完整语法支持**：`wx:if` / `wx:for` / `bind:` / `catch:` / `capture-*` 等
- **引号感知的词法扫描**：属性值里的 `<` `>` 不会被误判为标签边界，`{{ }}` 表达式与指令名无需占位保护即可原样保留
- **智能换行规则**：
  - 属性数 ≥ `wrapAttributes`（默认 3）时属性换行
  - 或开始标签原始长度 > 100 时属性换行
  - `<text>` 多属性换行时，文本内容与 `</text>` 仍保持同行
  - 属性较少且未超长时，内联标签保持单行
- **自闭合规范化**：`image` / `input` 等可配置标签统一为 `/>` 形式
- **多种触发方式**：文档格式化、选区格式化、命令面板 `Format WXML`
- **性能优化**：单次扫描、token 级自闭合合并、静态正则复用、缩进与配置缓存

## 安装

### 扩展市场

1. VS Code 扩展市场搜索 `WXML Formatter`
2. 安装后重新加载窗口（如需要）

### 本地 VSIX

```powershell
code --install-extension .\wxml-formatter-1.3.5.vsix
```

或在扩展视图 → `...` → **从 VSIX 安装**。

> 环境要求：VS Code `^1.74.0`。若需自行构建，Node.js 16+。

## 使用方法

### 格式化整个文件

- 快捷键：`Shift + Alt + F`（Windows/Linux）/ `Shift + Option + F`（Mac）
- 右键 → **Format Document**
- 命令面板 → `Format WXML`

### 格式化选中内容

- 快捷键：`Ctrl + K Ctrl + F`（Windows/Linux）/ `Cmd + K Cmd + F`（Mac）
- 右键 → **Format Selection**

> 提示：本扩展**未声明** `configurationDefaults`，因此不会自动成为 `.wxml` 的默认格式化器。若被其他格式化器抢占，请在 `.wxml` 文件中执行 **Format Document With...** 并指定 `WXML Formatter`。

## 配置选项

在 VS Code 设置中搜索 `wxml-formatter`，或写入 `settings.json`：

```json
{
  "wxml-formatter.indentSize": 2,
  "wxml-formatter.wrapAttributes": 3,
  "wxml-formatter.selfClosingTags": ["image", "input", "icon", "video"],
  "wxml-formatter.inlineTags": ["text", "icon", "rich-text"]
}
```

### 当前生效的配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `indentSize` | `2` | 缩进空格数 |
| `wrapAttributes` | `3` | 属性数达到该值时换行 |
| `selfClosingTags` | 14 个标签，见 [package.json](./package.json) | 规范为自闭合的标签 |
| `inlineTags` | `text` / `icon` / `rich-text` | 内容尽量与标签同行 |

### 硬编码阈值（暂不做成配置）

| 阈值 | 值 | 作用 |
|------|----|------|
| 开始标签原始长度 | **100** | 超过则强制属性换行，与 `wrapAttributes` 二选一触发 |
| 短文本内容上限 | **50** | `<tag>短文本</tag>` 三明治结构可保持单行 |

常量定义见 [`src/defaults.ts`](./src/defaults.ts) 的 `TAG_LENGTH_WRAP_THRESHOLD` 与 `SHORT_TEXT_INLINE_LIMIT`。

### 当前未生效的配置（设置面板仍可见）

以下项在 `package.json` 中保留声明，但 **1.3.4+ 运行时不再读取**，修改不会影响输出（计划后续实现）：

- `maxLineLength`
- `preserveNewlines`
- `alignAttributes`
- `sortAttributes`
- `blockTags`

## 格式化规则

同一处代码按以下优先级从上到下命中，先命中先返回：

| 优先级 | 条件 | 输出形态 |
|--------|------|----------|
| 1 | `<text>` + 需换行 + 三明治结构 | 每个属性一行，**末属性行收口**为 `>内容</text>` |
| 2 | 需换行（属性数达标 或 标签长度 > 100） | 属性逐行，`>` 单独一行，子内容缩进 +1 |
| 3 | 三明治结构 +（内联标签 或 文本 ≤ 50 字符） | 整段压成一行 |
| 4 | 自闭合 + 需换行 | 属性逐行，末属性带 ` />` |

其中「三明治结构」指 `<tag>` + 纯文本 + `</tag>` 的紧邻三段。文档输出恒定以单个换行符结尾。

## 支持的 WXML 语法

- 微信小程序组件（`view`、`text`、`button`、`image`、带连字符标签等）
- 条件渲染：`wx:if` / `wx:elif` / `wx:else`
- 列表渲染：`wx:for` / `wx:for-item` / `wx:for-index` / `wx:key`
- 事件绑定：`bind:` / `catch:` / `capture-bind:` / `capture-catch:`
- 双花括号表达式：`{{ }}`（含嵌套三元等）
- 模板相关：`template` / `import` / `include` / `wxs` / `slot`
- 布尔属性：`disabled` / `required` 等（无值属性保留）
- 注释：`<!-- -->`（整体保留，内部伪标签不参与换行判定）

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

### 表达式与大于号

**前：**

```xml
<view class="{{count > 0 ? 'active' : ''}}"><text>{{a < b}}</text></view>
```

属性值内的 `>` 会被引号状态正确跳过，不会被当作标签结束符。

## 已知限制

1. **5 个配置项未接入**，见上文「当前未生效的配置」。
2. **不接管语法高亮**。仓库内 `syntaxes/wxml.tmLanguage.json` 与 `language-configuration.json` 均为早期遗留，暂未在 `package.json` 中注册。
3. **不自动抢占默认格式化器**，见「使用方法」中的提示。
4. 未实现属性对齐与属性排序。
5. 选区格式化会**扩展到整行**后再格式化，避免从行中间切断标签；选区内原有缩进会被保留。

## 开发

### 环境准备

```powershell
npm install          # 当前仓库未包含 node_modules，需自行安装
```

### 常用命令

```powershell
npm run compile      # tsc 编译 TypeScript → out/
npm run watch        # tsc 监听编译
npm test             # 先 compile，再跑 test/formatter.test.js
npm run bench        # 性能微基准（test/bench.js）
npm run compile-web  # webpack 打包扩展入口 → dist/extension.js
npm run watch-web    # webpack 监听模式
npm run package      # vsce package，生成 .vsix
npm run publish      # vsce publish
```

还有 `package:pre-release` / `publish:pre-release` 用于预发布。

### 调试

1. 在 VS Code 中打开本项目
2. 按 `F5` 启动扩展开发主机
3. 在新窗口中打开任一 `.wxml` 文件测试
4. 观察调试控制台输出

### 项目结构

```text
formatter-wxml/
├── src/
│   ├── defaults.ts             # 阈值常量与默认配置
│   ├── format-core.ts          # 纯核心 formatWxml（不依赖 vscode）
│   ├── formatter.ts            # 读取 VS Code 配置并委托核心
│   └── extension.ts            # 命令 + 文档/选区格式化注册
├── test/
│   ├── formatter.test.js       # 22 个格式化用例（含幂等校验）
│   ├── bench.js                # 性能微基准
│   ├── examples/               # 测试输入样例
│   ├── output/                 # 测试输出（运行时生成，不入库）
│   └── *.wxml / *.js           # 手工调试用的临时样例，非自动化用例
├── out/                        # tsc 产物（供 Node 测试使用）
├── dist/                       # webpack 产物（扩展真正入口）
├── images/                     # 扩展图标
├── syntaxes/                   # 历史语法文件（当前未注册）
├── language-configuration.json # 历史语言配置（当前未注册）
├── package.json
├── tsconfig.json
├── webpack.config.js
├── CHANGELOG.md
├── operateLog.md               # 开发操作日志
└── LICENSE
```

### 架构说明

```text
src/defaults.ts      # 默认配置与阈值常量
src/format-core.ts   # 纯格式化核心 formatWxml（不依赖 vscode）
src/formatter.ts     # 读取 VS Code 配置并委托核心
src/extension.ts     # 命令 / DocumentFormatting / RangeFormatting 注册
```

`format-core.ts` 不 import `vscode`，测试与扩展共用同一份实现，因此不存在「测试代码与生产代码分叉」的问题——`test/formatter.test.js` 直接 require 编译产物 `out/format-core`。

### 主流程

1. **tokenize**：引号感知的单次顺序扫描，识别注释 / 开始标签 / 结束标签 / 自闭合标签 / 文本，并记录每个开始标签的原始长度
2. **normalizeSelfClosingTokens**：token 级合并相邻且无内容的成对标签 → 自闭合形式
3. **buildDocument**：按深度重建缩进文档，套用上文「格式化规则」
4. **finalCleanup**：收尾修复标签名与属性粘连、指令等号旁多余空格

### 测试

`npm test` 会先编译再运行 22 个用例，覆盖条件渲染、列表渲染、四类事件绑定、嵌套三元表达式、带连字符标签、布尔属性、属性值含 `>`、注释伪标签、同名标签长度阈值等场景。每个用例都会做**二次格式化幂等校验**（`format(format(x)) === format(x)`），防止输出逐次漂移；部分用例带 `expected` 做逐字节比对。输出写入 `test/output/`（该目录不入库）。

### 发布

1. 更新 `package.json` 版本号与 `CHANGELOG.md`
2. `npm run package` 打包验证
3. `npm run publish` 发布（需市场发布权限）

## 版本要点

- **1.3.5**：格式化热路径性能优化——占位保护收敛为引号感知单次扫描，静态正则复用、token 级自闭合合并、Set/缩进缓存、配置缓存
- **1.3.4**：纯核心拆分、标签长度阈值修复、测试与生产共用实现、移除未使用的 `js-beautify`
- 更早变更见 [CHANGELOG.md](./CHANGELOG.md)

## 常见问题

**Q: 格式化没生效？**  
A: 确认文件扩展名是 `.wxml`，并检查是否被其他格式化扩展覆盖默认格式化器（本扩展不自动注册默认格式化器）。

**Q: 改了 `blockTags` / `maxLineLength` 没变化？**  
A: 这些配置当前未接入运行时，见上文「当前未生效的配置」。

**Q: 选区格式化后缩进错乱了？**  
A: 不会了。1.3.5 起选区会被扩展到整行并从选区内首个有效行恢复基准缩进；若仍异常请提 issue 并附上选区范围。

**Q: 会不会接管语法高亮？**  
A: 不会。本扩展只做格式化，不抢 WXML 高亮，避免与其他高亮插件冲突。

## 许可证

见 [LICENSE](./LICENSE)。

## 反馈

- Issues：<https://github.com/60liulin60/formatter-wxml/issues>
- 仓库：<https://github.com/60liulin60/formatter-wxml>
