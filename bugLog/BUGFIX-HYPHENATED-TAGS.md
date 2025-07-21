# 修复带连字符标签被截断的问题

## 问题描述

在格式化 WXML 文件时，带连字符的标签（如 `scroll-view`、`swiper-item`、`picker-view` 等）会被错误地截断。例如：

- `<scroll-view>` 被改为 `<scroll>`
- `<swiper-item>` 被改为 `<swiper>`
- `<picker-view>` 被改为 `<picker>`

这导致生成的 WXML 文件语法错误，无法正常运行。

## 问题根源

问题出现在 `src/formatter.ts` 文件中的多个正则表达式，这些正则表达式使用了 `\w+` 来匹配标签名，但 `\w+` 只匹配字母、数字和下划线，**不匹配连字符**。

具体问题位置：

1. `formatMultiAttributeTags` 方法中的两个正则表达式：
   - 第795行：`/<(\w+)([^>]+?)\/>/g` （自闭合标签）
   - 第809行：`/<(\w+)([^>]+?)>/g` （普通开始标签）

2. 其他相关的正则表达式也存在同样的问题

## 修复方案

将所有涉及标签名匹配的正则表达式中的 `\w+` 替换为 `[\w-]+`，以支持带连字符的标签名。

### 修复的文件位置

在 `src/formatter.ts` 中修复了以下正则表达式：

1. **第795行** - 自闭合标签处理：

   ```typescript
   // 修复前
   const selfClosingPattern = /<(\w+)([^>]+?)\/>/g;
   // 修复后
   const selfClosingPattern = /<([\w-]+)([^>]+?)\/>/g;
   ```

2. **第809行** - 普通开始标签处理：

   ```typescript
   // 修复前
   const tagPattern = /<(\w+)([^>]+?)>/g;
   // 修复后
   const tagPattern = /<([\w-]+)([^>]+?)>/g;
   ```

3. **第161行** - 标签格式修复：

   ```typescript
   // 修复前
   processed = processed.replace(/<(\w+)([a-zA-Z][^=\s>]*=)/g, "<$1 $2");
   // 修复后
   processed = processed.replace(/<([\w-]+)([a-zA-Z][^=\s>]*=)/g, "<$1 $2");
   ```

4. **其他相关位置** - 总共修复了12处正则表达式

## 测试验证

### 测试用例

创建了专门的测试用例来验证修复效果：

1. **scroll-view 标签测试**
2. **swiper-item 标签测试**
3. **picker-view 和 picker-view-column 标签测试**
4. **cover-view 和 cover-image 标签测试**
5. **movable-area 和 movable-view 标签测试**

### 测试结果

所有带连字符的标签都能正确处理：

```xml
<!-- 修复前 -->
<scroll
  class="scroll-view_H"
  scroll-x="true">
  <!-- 内容 -->
</scroll-view>

<!-- 修复后 -->
<scroll-view
  class="scroll-view_H"
  scroll-x="true">
  <!-- 内容 -->
</scroll-view>
```

### 回归测试

运行了完整的测试套件，确认修复没有破坏其他功能，所有12个测试用例都通过。

## 影响范围

此修复影响所有微信小程序中使用连字符的标签，包括但不限于：

- `scroll-view`
- `swiper-item`
- `picker-view`
- `picker-view-column`
- `cover-view`
- `cover-image`
- `movable-area`
- `movable-view`
- `page-container`
- `share-element`
- `live-player`
- `live-pusher`
- `web-view`
- `official-account`
- `open-data`
- `rich-text`

## 版本信息

- **修复版本**: v1.2.2
- **修复日期**: 2025-07-21
- **修复文件**: `src/formatter.ts`
- **影响**: 所有带连字符的 WXML 标签

## 总结

这是一个关键的 bug 修复，解决了格式化器无法正确处理微信小程序中常用的带连字符标签的问题。修复后，所有 WXML 标签都能正确格式化，不会出现标签名被截断的情况。
