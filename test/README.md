# 测试文档

这个目录包含了WXML格式化器的所有测试文件和示例。

## 目录结构

```
test/
├── README.md              # 测试文档
├── formatter.test.js      # 格式化器单元测试
├── run-tests.js          # 测试运行器
├── examples/             # 测试示例文件
│   ├── simple.wxml       # 简单示例
│   ├── complex.wxml      # 复杂示例
│   ├── conditional.wxml  # 条件渲染示例
│   ├── loop.wxml         # 循环渲染示例
│   ├── events.wxml       # 事件绑定示例
│   └── expressions.wxml  # 表达式示例
└── output/               # 测试输出结果（自动生成）
```

## 运行测试

### 运行所有测试
```bash
cd test
node run-tests.js
```

### 运行单元测试
```bash
cd test
node formatter.test.js
```

### 运行文件测试
```bash
cd test
node -e "require('./run-tests').runFileTests()"
```

### 运行性能测试
```bash
cd test
node -e "require('./run-tests').runPerformanceTests()"
```

## 测试用例说明

### 单元测试 (formatter.test.js)
- **简单WXML格式化**: 测试基本的WXML元素格式化
- **条件渲染格式化**: 测试wx:if, wx:elif, wx:else的格式化
- **列表渲染格式化**: 测试wx:for循环的格式化
- **事件绑定格式化**: 测试各种事件绑定的格式化
- **双花括号表达式保护**: 测试复杂表达式的保护

### 文件测试示例

#### simple.wxml
基础的WXML结构，包含：
- 基本组件 (view, text, button)
- 条件渲染 (wx:if)
- 事件绑定 (bind:tap)
- 列表渲染 (wx:for)

#### complex.wxml
复杂的页面结构，包含：
- 嵌套组件
- 多层条件判断
- 复杂的列表渲染
- 多种事件绑定
- 数据绑定

#### conditional.wxml
专门测试条件渲染：
- wx:if / wx:elif / wx:else
- 嵌套条件
- 复杂条件表达式

#### loop.wxml
专门测试循环渲染：
- 嵌套循环
- 自定义item和index名称
- 复杂的key绑定

#### events.wxml
专门测试事件绑定：
- bind: 事件绑定
- catch: 阻止冒泡
- capture-bind: / capture-catch: 捕获事件
- 多事件绑定

#### expressions.wxml
专门测试表达式：
- 复杂的JavaScript表达式
- 三元运算符
- 字符串拼接
- 数学计算
- 函数调用

## 测试输出

所有测试结果会保存在 `output/` 目录中：
- 单元测试结果：`test-{编号}-{测试名称}.wxml`
- 文件测试结果：`{文件名}-formatted.wxml`
- 性能测试结果：`performance-test.wxml`

## 添加新测试

### 添加新的示例文件
1. 在 `examples/` 目录中创建新的 `.wxml` 文件
2. 运行 `node run-tests.js` 自动包含新文件

### 添加新的单元测试
1. 在 `formatter.test.js` 的 `testCases` 数组中添加新测试用例
2. 包含 `name`、`input` 和 `description` 字段

### 自定义测试配置
可以修改 `formatter.test.js` 中的格式化选项来测试不同的配置。

## 预期结果

格式化后的WXML应该：
- ✅ 正确的缩进结构
- ✅ 保留所有WXML特有语法
- ✅ 保护双花括号表达式不被破坏
- ✅ 合理的换行和空格
- ✅ 一致的代码风格
