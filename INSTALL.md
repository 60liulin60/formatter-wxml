# 安装和开发指南

## 用户安装指南

### 从VSCode扩展市场安装

1. 打开 Visual Studio Code
2. 点击左侧活动栏的扩展图标（或按 `Ctrl+Shift+X`）
3. 在搜索框中输入 "WXML Formatter"
4. 找到插件并点击"安装"
5. 重启 VSCode（如果需要）

### 手动安装 .vsix 文件

1. 下载最新的 `.vsix` 文件
2. 在 VSCode 中按 `Ctrl+Shift+P` 打开命令面板
3. 输入 "Extensions: Install from VSIX..."
4. 选择下载的 `.vsix` 文件
5. 重启 VSCode

## 开发环境设置

### 前置要求

- Node.js (版本 16 或更高)
- npm 或 yarn
- Visual Studio Code
- Git

### 克隆项目

```bash
git clone <repository-url>
cd formatter-wxml
```

### 安装依赖

```bash
npm install
```

### 编译项目

```bash
npm run compile
```

### 监听模式编译

```bash
npm run watch
```

## 测试插件

### 方法1: 使用F5调试

1. 在VSCode中打开项目
2. 按 `F5` 启动扩展开发主机
3. 在新窗口中打开包含.wxml文件的项目
4. 测试格式化功能

### 方法2: 运行测试套件

```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行文件测试
npm run test:files

# 运行性能测试
npm run test:performance
```

### 方法3: 快速测试

```bash
# 进入测试目录
cd test

# 运行快速测试
node quick-test.js

# 测试特定功能
node test-hyphenated-tags.js
node test-scroll-view-issue.js
```

### 测试文件说明

- `test/examples/` - 包含各种测试用例的WXML文件
- `test/output/` - 格式化后的输出文件
- `test/run-tests.js` - 主测试运行器
- `test/formatter.test.js` - 单元测试
- `test/test-hyphenated-tags.js` - 带连字符标签测试

## 打包发布

### 安装vsce工具

```bash
npm install -g vsce
```

### 打包扩展

```bash
vsce package
```

这将生成一个 `.vsix` 文件，可以手动安装到VSCode中。

### 发布到市场

```bash
vsce publish
```

## 项目结构

```text
formatter-wxml/
├── src/                           # TypeScript源代码
│   ├── extension.ts               # 扩展主入口
│   └── formatter.ts               # 格式化器核心逻辑
├── test/                          # 测试文件
│   ├── examples/                  # 测试用例WXML文件
│   │   ├── simple.wxml           # 简单示例
│   │   ├── complex.wxml          # 复杂示例
│   │   ├── conditional.wxml      # 条件渲染示例
│   │   ├── loop.wxml             # 循环渲染示例
│   │   ├── events.wxml           # 事件绑定示例
│   │   ├── expressions.wxml      # 表达式示例
│   │   └── new-rules.wxml        # 新规则示例
│   ├── output/                   # 格式化输出文件
│   ├── run-tests.js              # 主测试运行器
│   ├── formatter.test.js         # 单元测试
│   ├── test-hyphenated-tags.js   # 带连字符标签测试
│   └── test-scroll-view-issue.js # 滚动视图问题测试
├── syntaxes/                     # 语法高亮定义
│   └── wxml.tmLanguage.json
├── images/                       # 图标资源
│   ├── logo.png
│   └── logo.svg
├── bugLog/                       # 错误修复记录
│   └── BUGFIX-HYPHENATED-TAGS.md
├── otherMd/                      # 其他文档
│   ├── NEW-FORMATTING-RULES.md
│   └── OPTIMIZATION-SUMMARY.md
├── out/                          # 编译输出
├── node_modules/                 # 依赖包
├── package.json                  # 扩展配置和依赖
├── package-lock.json             # 依赖锁定文件
├── tsconfig.json                 # TypeScript配置
├── language-configuration.json   # 语言配置
├── README.md                     # 项目说明文档
├── INSTALL.md                    # 安装和开发指南
├── CHANGELOG.md                  # 更新日志
└── *.vsix                        # 打包的扩展文件
```

## 功能测试

项目包含了丰富的测试用例：

### 基础测试用例

- `test/examples/simple.wxml` - 简单WXML格式化
- `test/examples/complex.wxml` - 复杂嵌套结构
- `test/examples/conditional.wxml` - 条件渲染测试
- `test/examples/loop.wxml` - 列表渲染测试
- `test/examples/events.wxml` - 事件绑定测试
- `test/examples/expressions.wxml` - 双花括号表达式测试

### 专项测试用例

- `test/test-hyphenated-tags.js` - 带连字符标签测试（v1.2.2重要修复）
- `test/test-scroll-view-issue.js` - 滚动视图问题测试
- `test/final-verification.js` - 最终验证测试

### 输出文件

运行测试后会在 `test/output/` 目录生成格式化后的文件，便于对比和验证。

## 开发流程

### 1. 修改代码

主要的格式化逻辑在 `src/formatter.ts` 文件中，扩展入口在 `src/extension.ts` 文件中。

### 2. 编译和测试

```bash
# 编译代码
npm run compile

# 运行测试
npm test

# 监听模式（开发时推荐）
npm run watch
```

### 3. 调试

1. 在 VSCode 中打开项目
2. 按 `F5` 启动调试
3. 在新窗口中测试功能
4. 查看调试控制台的输出

### 4. 添加测试用例

在 `test/examples/` 目录下添加新的测试文件，然后在相应的测试脚本中添加测试逻辑。

## 发布流程

### 1. 更新版本

```bash
# 更新 package.json 中的版本号
# 更新 CHANGELOG.md
# 提交更改
```

### 2. 打包和发布

```bash
# 打包扩展
npm run package

# 发布到市场（需要发布权限）
npm run publish

# 预发布版本
npm run package:pre-release
npm run publish:pre-release
```

## 贡献指南

### 提交代码

1. Fork 项目到您的 GitHub 账户
2. 创建功能分支：`git checkout -b feature/your-feature-name`
3. 进行更改并添加测试
4. 确保所有测试通过：`npm test`
5. 提交更改：`git commit -m "Add your feature"`
6. 推送到分支：`git push origin feature/your-feature-name`
7. 创建 Pull Request

### 代码规范

- 使用 TypeScript 编写代码
- 遵循现有的代码风格
- 为新功能添加测试用例
- 更新相关文档

### 报告问题

如果发现 bug 或有功能建议：

1. 在 GitHub Issues 中搜索是否已有相关问题
2. 如果没有，创建新的 Issue
3. 提供详细的问题描述和重现步骤
4. 如果可能，提供示例 WXML 文件

## 常见问题

### Q: 编译失败怎么办？

A: 确保 Node.js 版本 >= 16，删除 `node_modules` 和 `package-lock.json`，重新运行 `npm install`。

### Q: 测试失败怎么办？

A: 检查是否有语法错误，确保所有依赖已正确安装，查看测试输出的错误信息。

### Q: 如何添加新的格式化规则？

A: 在 `src/formatter.ts` 中添加相应的逻辑，然后在 `test/` 目录下添加测试用例验证功能。
