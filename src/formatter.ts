import * as vscode from "vscode";
import { html as beautifyHtml } from "js-beautify";

export class WXMLFormatter {
  private getConfiguration() {
    const config = vscode.workspace.getConfiguration("wxml-formatter");
    return {
      indentSize: config.get<number>("indentSize", 2),
      maxLineLength: config.get<number>("maxLineLength", 120),
      preserveNewlines: config.get<boolean>("preserveNewlines", true),
      // 新增配置选项
      wrapAttributes: config.get<number>("wrapAttributes", 3), // 超过多少个属性时换行
      alignAttributes: config.get<boolean>("alignAttributes", true), // 是否对齐属性
      sortAttributes: config.get<boolean>("sortAttributes", false), // 是否排序属性
      selfClosingTags: config.get<string[]>("selfClosingTags", ["image", "input", "icon"]), // 自闭合标签列表
      inlineTags: config.get<string[]>("inlineTags", ["text", "icon"]), // 内联标签列表
      blockTags: config.get<string[]>("blockTags", [
        "view", "scroll-view", "swiper", "swiper-item", "movable-area", "movable-view",
        "cover-view", "cover-image", "page-container", "share-element",
        "form", "picker", "picker-view", "slider", "switch", "textarea",
        "navigator", "functional-page-navigator", "live-player", "live-pusher",
        "map", "canvas", "web-view", "ad", "official-account", "open-data",
        "rich-text", "progress", "button", "checkbox", "radio", "label"
      ]), // 块级标签列表
    };
  }

  public format(text: string): string {
    const config = this.getConfiguration();

    // 预处理WXML特有的语法
    let processedText = this.preprocessWXML(text);

    // 使用js-beautify格式化HTML结构
    const beautifyOptions = {
      indent_size: config.indentSize,
      indent_char: " ",
      max_preserve_newlines: config.preserveNewlines ? 2 : 1,
      preserve_newlines: config.preserveNewlines,
      keep_array_indentation: false,
      break_chained_methods: false,
      indent_scripts: "keep" as "keep",
      indent_styles: "keep" as "keep",
      space_before_conditional: true,
      unescape_strings: false,
      jslint_happy: false,
      end_with_newline: true,
      wrap_line_length: config.maxLineLength,
      indent_inner_html: true,
      comma_first: false,
      e4x: false,
      indent_empty_lines: false,
      // 强制每个标签独立成行
      wrap_attributes: "force-aligned" as "force-aligned",
      wrap_attributes_indent_size: config.indentSize,
    };

    try {
      // 使用自定义的WXML格式化器，完全绕过js-beautify的问题
      let formatted = this.customWXMLFormat(processedText);

      // 后处理WXML特有的语法
      formatted = this.postprocessWXML(formatted);

      return formatted;
    } catch (error) {
      throw new Error(`Failed to format WXML: ${error}`);
    }
  }

  private preprocessWXML(text: string): string {
    // 处理WXML的双花括号表达式，避免被HTML格式化器破坏
    let processed = text;
    const config = this.getConfiguration();

    // 首先处理块级标签的换行，在表达式替换之前
    processed = this.preProcessBlockTagSeparation(processed);

    // 保护双花括号表达式（包括嵌套的花括号）
    const expressions: string[] = [];
    processed = processed.replace(/\{\{[^}]*(?:\{[^}]*\}[^}]*)*\}\}/g, (match) => {
      const index = expressions.length;
      expressions.push(match);
      return `__WXML_EXPR_${index}__`;
    });

    // 保护WXML特有的指令和属性
    const directives: string[] = [];
    processed = processed.replace(/(wx:|bind:|catch:|capture-bind:|capture-catch:)[\w-]+/g, (match) => {
      const index = directives.length;
      directives.push(match);
      return `__WXML_DIR_${index}__`;
    });

    // 预处理自闭合标签
    config.selfClosingTags.forEach(tagName => {
      // 处理有属性的标签
      processed = processed.replace(
        new RegExp(`<${tagName}(\\s[^>]*?)><\\/${tagName}>`, 'g'),
        (match, attrs) => {
          return `<${tagName}${attrs} />`;
        }
      );
      // 处理没有属性的标签
      processed = processed.replace(
        new RegExp(`<${tagName}><\\/${tagName}>`, 'g'),
        `<${tagName} />`
      );
      // 规范化已有的自闭合标签
      processed = processed.replace(
        new RegExp(`<${tagName}([^>]*?)\\/>`, 'g'),
        (match, attrs) => {
          const trimmedAttrs = attrs.trim();
          return trimmedAttrs ? `<${tagName} ${trimmedAttrs} />` : `<${tagName} />`;
        }
      );
    });

    // 存储表达式和指令以便后续恢复
    (this as any)._expressions = expressions;
    (this as any)._directives = directives;

    return processed;
  }

  private preProcessBlockTagSeparation(text: string): string {
    let processed = text;

    // 简单直接的方法：处理最常见的相邻块级标签
    // 专门处理swiper-item的情况
    processed = processed.replace(/<\/swiper-item><swiper-item/g, '</swiper-item>\n<swiper-item');
    processed = processed.replace(/<\/view><view/g, '</view>\n<view');
    processed = processed.replace(/<\/button><button/g, '</button>\n<button');

    return processed;
  }

  private postprocessWXML(text: string): string {
    let processed = text;
    const expressions = (this as any)._expressions || [];
    const directives = (this as any)._directives || [];

    // 恢复WXML指令
    processed = processed.replace(/__WXML_DIR_(\d+)__/g, (match, index) => {
      return directives[parseInt(index)] || match;
    });

    // 恢复双花括号表达式
    processed = processed.replace(/__WXML_EXPR_(\d+)__/g, (match, index) => {
      return expressions[parseInt(index)] || match;
    });

    // 清理临时存储
    delete (this as any)._expressions;
    delete (this as any)._directives;

    // 格式化WXML特有的属性
    processed = this.formatWXMLAttributes(processed);

    // 修复标签格式 - 确保标签名和属性之间有空格
    processed = processed.replace(/<([\w-]+)([a-zA-Z][^=\s>]*=)/g, "<$1 $2");

    // 修复常见的标签名和属性粘连问题
    const config = this.getConfiguration();
    config.selfClosingTags.forEach(tagName => {
      processed = processed.replace(
        new RegExp(`<${tagName}([a-zA-Z])`, 'g'),
        `<${tagName} $1`
      );
    });

    // 最后强制处理块级标签的换行问题
    processed = this.finalBlockTagFix(processed);

    return processed;
  }

  private customWXMLFormat(text: string): string {
    const config = this.getConfiguration();

    // 1. 先处理多属性标签
    let formatted = this.formatMultiAttributeTags(text);

    // 2. 解析并重新构建整个文档结构
    formatted = this.parseAndRebuild(formatted, config.indentSize);

    // 3. 最后进行一次完整的缩进修复
    formatted = this.finalIndentFix(formatted, config.indentSize);

    return formatted;
  }

  private finalIndentFix(text: string, indentSize: number): string {
    const lines = text.split('\n');
    const result = [];
    let depth = 0;
    let inMultiLineTag = false;
    let multiLineTagStartDepth = 0;
    const indent = ' '.repeat(indentSize);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed) {
        result.push('');
        continue;
      }

      // 检查是否是属性行（不以 < 开始，但包含 = 符号）
      const isAttributeLine = !trimmed.startsWith('<') && trimmed.includes('=');

      // 检查是否包含结束标签
      const hasClosingTag = trimmed.includes('</');

      // 如果是结束标签，先减少深度
      if (trimmed.startsWith('</')) {
        depth = Math.max(0, depth - 1);
        inMultiLineTag = false;
      }

      if (isAttributeLine) {
        // 属性行使用额外的缩进
        if (inMultiLineTag) {
          result.push(indent.repeat(multiLineTagStartDepth + 1) + trimmed);
        } else {
          result.push(indent.repeat(depth + 1) + trimmed);
        }
      } else {
        // 普通行使用当前深度的缩进
        result.push(indent.repeat(depth) + trimmed);
      }

      // 如果是开始标签（不是自闭合，不是注释，不是同行闭合）
      if (trimmed.startsWith('<') &&
          !trimmed.startsWith('</') &&
          !trimmed.startsWith('<!--') &&
          !trimmed.endsWith('/>') &&
          !this.isSameLineTag(trimmed)) {

        if (trimmed.includes('>')) {
          // 完整的单行标签
          depth++;
          inMultiLineTag = false;
        } else {
          // 多行标签的开始
          inMultiLineTag = true;
          multiLineTagStartDepth = depth;
        }
      } else if (inMultiLineTag && trimmed.includes('>') && !trimmed.startsWith('<')) {
        // 多行标签的结束（属性行包含 >）
        // 检查是否是自闭合标签
        if (!trimmed.endsWith('/>')) {
          depth++;
        }
        inMultiLineTag = false;
      }

      // 处理属性行中包含结束标签的情况（如 class="edit-btn">编辑</button>）
      if (hasClosingTag && !trimmed.startsWith('</') && isAttributeLine) {
        // 只有当这是属性行且包含结束标签时才处理
        const closingTagMatches = trimmed.match(/<\/[^>]+>/g);
        if (closingTagMatches) {
          depth = Math.max(0, depth - closingTagMatches.length);
        }
      }
    }

    return result.join('\n');
  }

  private parseAndRebuild(text: string, indentSize: number): string {
    // 移除多余的空白，但保留必要的换行
    let cleaned = text.replace(/>\s+</g, '><').trim();

    // 在标签之间添加换行
    cleaned = cleaned.replace(/></g, '>\n<');

    // 处理文本内容
    cleaned = cleaned.replace(/>([^<\n]+)</g, (match, content) => {
      const trimmedContent = content.trim();
      if (trimmedContent) {
        return `>${trimmedContent}<`;
      }
      return '><';
    });

    // 使用简化的缩进计算
    return this.simpleIndentCalculation(cleaned, indentSize);
  }

  private simpleIndentCalculation(text: string, indentSize: number): string {
    const lines = text.split('\n');
    const result = [];
    let depth = 0;
    let inMultiLineTag = false;
    let multiLineTagStartDepth = 0;
    const indent = ' '.repeat(indentSize);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed) continue;

      // 检查是否是属性行（不以 < 开始，但包含 = 符号）
      const isAttributeLine = !trimmed.startsWith('<') && trimmed.includes('=');

      // 检查是否包含结束标签
      const hasClosingTag = trimmed.includes('</');

      // 如果是结束标签，先减少深度
      if (trimmed.startsWith('</')) {
        depth = Math.max(0, depth - 1);
        inMultiLineTag = false;
      }

      // 应用缩进
      if (isAttributeLine) {
        if (inMultiLineTag) {
          result.push(indent.repeat(multiLineTagStartDepth + 1) + trimmed);
        } else {
          result.push(indent.repeat(depth + 1) + trimmed);
        }
      } else {
        result.push(indent.repeat(depth) + trimmed);
      }

      // 如果是开始标签（不是自闭合，不是注释，不是同行闭合）
      if (trimmed.startsWith('<') &&
          !trimmed.startsWith('</') &&
          !trimmed.startsWith('<!--') &&
          !trimmed.endsWith('/>') &&
          !this.isSameLineTag(trimmed)) {

        if (trimmed.includes('>')) {
          // 完整的单行标签
          depth++;
          inMultiLineTag = false;
        } else {
          // 多行标签的开始
          inMultiLineTag = true;
          multiLineTagStartDepth = depth;
        }
      } else if (inMultiLineTag && trimmed.includes('>') && !trimmed.startsWith('<')) {
        // 多行标签的结束（属性行包含 >）
        // 检查是否是自闭合标签
        if (!trimmed.endsWith('/>')) {
          depth++;
        }
        inMultiLineTag = false;
      }

      // 处理属性行中包含结束标签的情况（如 class="edit-btn">编辑</button>）
      if (hasClosingTag && !trimmed.startsWith('</') && isAttributeLine) {
        // 只有当这是属性行且包含结束标签时才处理
        const closingTagMatches = trimmed.match(/<\/[^>]+>/g);
        if (closingTagMatches) {
          depth = Math.max(0, depth - closingTagMatches.length);
        }
      }
    }

    return result.join('\n');
  }



  private finalBlockTagFix(text: string): string {
    let fixed = text;

    // 最简单粗暴的方法：直接字符串替换
    // 处理swiper-item的换行问题
    fixed = fixed.replace(/(\s*)<\/swiper-item><swiper-item/g, (match, indent) => {
      return `${indent}</swiper-item>\n${indent}<swiper-item`;
    });

    // 处理其他常见的块级标签
    fixed = fixed.replace(/(\s*)<\/view><view/g, (match, indent) => {
      return `${indent}</view>\n${indent}<view`;
    });

    fixed = fixed.replace(/(\s*)<\/button><button/g, (match, indent) => {
      return `${indent}</button>\n${indent}<button`;
    });

    return fixed;
  }

  private formatWXMLAttributes(text: string): string {
    // 格式化wx:前缀的属性
    let formatted = text;

    // 确保wx:属性的格式正确
    formatted = formatted.replace(
      /(wx:|bind:|catch:|capture-bind:|capture-catch:)(\w+)(\s*=\s*)(['"])/g,
      "$1$2=$4"
    );

    // 格式化条件渲染 - 支持更复杂的表达式
    formatted = formatted.replace(
      /wx:if\s*=\s*(['"])\s*\{\{([^}]+(?:\{[^}]*\}[^}]*)*)\}\}\s*\1/g,
      'wx:if="{{$2}}"'
    );

    formatted = formatted.replace(
      /wx:elif\s*=\s*(['"])\s*\{\{([^}]+(?:\{[^}]*\}[^}]*)*)\}\}\s*\1/g,
      'wx:elif="{{$2}}"'
    );

    // 格式化循环 - 支持更复杂的表达式
    formatted = formatted.replace(
      /wx:for\s*=\s*(['"])\s*\{\{([^}]+(?:\{[^}]*\}[^}]*)*)\}\}\s*\1/g,
      'wx:for="{{$2}}"'
    );

    // 格式化其他wx:属性
    formatted = formatted.replace(
      /wx:for-item\s*=\s*(['"])([^'"]+)\1/g,
      'wx:for-item="$2"'
    );

    formatted = formatted.replace(
      /wx:for-index\s*=\s*(['"])([^'"]+)\1/g,
      'wx:for-index="$2"'
    );

    formatted = formatted.replace(
      /wx:key\s*=\s*(['"])([^'"]+)\1/g,
      'wx:key="$2"'
    );

    // 格式化事件绑定属性
    formatted = formatted.replace(
      /(bind:|catch:|capture-bind:|capture-catch:)(\w+)\s*=\s*(['"])([^'"]+)\3/g,
      '$1$2="$4"'
    );

    // 格式化data-*属性
    formatted = formatted.replace(
      /data-(\w+)\s*=\s*(['"])\s*\{\{([^}]+(?:\{[^}]*\}[^}]*)*)\}\}\s*\2/g,
      'data-$1="{{$3}}"'
    );

    return formatted;
  }

  private forceFixFormatting(text: string): string {
    const config = this.getConfiguration();
    let formatted = text;

    // 1. 处理自闭合标签
    formatted = this.formatSelfClosingTags(formatted);

    // 2. 完全重新格式化以匹配期望的格式
    formatted = this.completeReformat(formatted, config.indentSize);

    return formatted;
  }

  private completeReformat(text: string, indentSize: number): string {
    // 简单的标签分离和缩进修复
    let result = text;

    // 1. 确保块级标签分离
    result = this.ensureBlockTagSeparation(result);

    // 2. 重新计算缩进
    result = this.recalculateIndentation(result, indentSize);

    return result;
  }

  private ensureBlockTagSeparation(text: string): string {
    const config = this.getConfiguration();
    const blockTags = config.blockTags;
    let result = text;

    // 确保 </tag><tag> 分离
    result = result.replace(/<\/([\w-]+)><([\w-]+)/g, (match, endTag, startTag) => {
      if (blockTags.includes(endTag) || blockTags.includes(startTag)) {
        return `</${endTag}>\n<${startTag}`;
      }
      return match;
    });

    // 确保 ><tag> 分离（但保持文本内容）
    result = result.replace(/>(<[\w-]+)/g, (match, nextTag) => {
      const tagName = nextTag.match(/<([\w-]+)/)?.[1];
      if (tagName && blockTags.includes(tagName)) {
        return `>\n${nextTag}`;
      }
      return match;
    });

    return result;
  }

  private recalculateIndentation(text: string, indentSize: number): string {
    const lines = text.split('\n');
    const result = [];
    const indent = ' '.repeat(indentSize);

    // 首先，找出所有属性行并标记它们
    const attributeLines = new Set<number>();
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (this.isAttributeLineNew(trimmed, lines, i)) {
        attributeLines.add(i);
      }
    }

    // 然后，重新计算缩进，忽略属性行对深度的影响
    let depth = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        result.push('');
        continue;
      }

      if (attributeLines.has(i)) {
        // 属性行：找到它所属的标签的缩进，然后加一级
        const tagDepth = this.findTagDepthForAttribute(lines, i, attributeLines);
        result.push(indent.repeat(tagDepth + 1) + trimmed);
        continue;
      }

      // 如果是结束标签，先减少深度
      if (trimmed.startsWith('</')) {
        depth = Math.max(0, depth - 1);
      }

      // 应用当前深度的缩进
      result.push(indent.repeat(depth) + trimmed);

      // 如果是开始标签（不是自闭合，不是注释，不是同行闭合）
      if (trimmed.startsWith('<') &&
          !trimmed.startsWith('</') &&
          !trimmed.startsWith('<!--') &&
          !trimmed.endsWith('/>') &&
          !this.isSameLineTag(trimmed)) {
        depth++;
      }
    }

    return result.join('\n');
  }

  private findTagDepthForAttribute(lines: string[], attributeLineIndex: number, attributeLines: Set<number>): number {
    // 向前查找，找到这个属性所属的标签
    for (let i = attributeLineIndex - 1; i >= 0; i--) {
      if (attributeLines.has(i)) {
        continue; // 跳过其他属性行
      }

      const trimmed = lines[i].trim();
      if (trimmed.startsWith('<') && !trimmed.includes('>')) {
        // 找到了多行标签的开始，计算它的深度
        const leadingSpaces = lines[i].length - lines[i].trimLeft().length;
        return Math.floor(leadingSpaces / 2); // 假设缩进是2个空格
      }
    }
    return 0;
  }

  private isAttributeLineNew(trimmed: string, lines: string[], currentIndex: number): boolean {
    // 属性行的特征：
    // 1. 包含 = 符号
    // 2. 不以 < 开始（不是标签）
    // 3. 前面有一个多行标签的开始

    if (!trimmed.includes('=') || trimmed.startsWith('<')) {
      return false;
    }

    // 向前查找，看是否有一个多行标签的开始
    for (let j = currentIndex - 1; j >= 0; j--) {
      const prevLine = lines[j].trim();
      if (!prevLine) continue;

      // 如果找到一个完整的标签（包含 >），说明不是多行标签
      if (prevLine.includes('>')) {
        return false;
      }

      // 如果找到一个标签开始（以 < 开始但不包含 >），说明是多行标签
      if (prevLine.startsWith('<') && !prevLine.includes('>')) {
        return true;
      }

      // 如果找到另一个属性行，继续向前查找
      if (prevLine.includes('=') && !prevLine.startsWith('<')) {
        continue;
      }

      // 其他情况，不是属性行
      return false;
    }

    return false;
  }

  private forceSeparateBlockTags(text: string): string {
    const config = this.getConfiguration();
    const blockTags = config.blockTags;
    // 将 text 也视为需要分离的标签
    const allSeparateTags = [...blockTags, 'text'];
    let result = text;

    // 1. 强制分离 ></tag> 模式
    result = result.replace(/>(<\/[\w-]+>)/g, (match, endTag) => {
      const tagName = endTag.match(/<\/([\w-]+)>/)?.[1];
      if (tagName && allSeparateTags.includes(tagName)) {
        return `>\n${endTag}`;
      }
      return match;
    });

    // 2. 强制分离 </tag><tag> 模式
    result = result.replace(/<\/([\w-]+)><([\w-]+)/g, (match, endTag, startTag) => {
      if (allSeparateTags.includes(endTag) || allSeparateTags.includes(startTag)) {
        return `</${endTag}>\n<${startTag}`;
      }
      return match;
    });

    // 3. 处理开始标签后紧跟其他标签的情况
    result = result.replace(/>(<[\w-]+)/g, (match, nextTag) => {
      const tagName = nextTag.match(/<([\w-]+)/)?.[1];
      if (tagName && allSeparateTags.includes(tagName)) {
        return `>\n${nextTag}`;
      }
      return match;
    });

    // 4. 特殊处理：确保 <text> 标签独立成行
    result = result.replace(/(<text[^>]*>[^<]*<\/text>)(<text)/g, '$1\n$2');

    // 5. 清理多余的空行
    result = result.replace(/\n\s*\n/g, '\n');

    return result;
  }

  private forceFixIndentation(text: string, indentSize: number): string {
    const lines = text.split('\n');
    const result = [];
    const indent = ' '.repeat(indentSize);

    // 先计算每一行的正确深度
    const depths = this.calculateDepths(lines);

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      if (!trimmed) {
        result.push('');
        continue;
      }

      // 应用计算出的缩进
      result.push(indent.repeat(depths[i]) + trimmed);
    }

    return result.join('\n');
  }

  private calculateDepths(lines: string[]): number[] {
    const depths = [];
    let currentDepth = 0;
    let inMultiLineTag = false;
    let multiLineTagStartDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      if (!trimmed) {
        depths.push(0);
        continue;
      }

      // 检查是否是属性行（不以 < 开始，但包含 = 符号）
      const isAttributeLine = !trimmed.startsWith('<') && trimmed.includes('=');

      // 检查是否包含结束标签
      const hasClosingTag = trimmed.includes('</');

      // 如果是结束标签，先减少深度
      if (trimmed.startsWith('</')) {
        currentDepth = Math.max(0, currentDepth - 1);
        inMultiLineTag = false;
      }

      // 属性行使用额外的缩进
      if (isAttributeLine) {
        if (inMultiLineTag) {
          depths.push(multiLineTagStartDepth + 1);
        } else {
          depths.push(currentDepth + 1);
        }
      } else {
        depths.push(currentDepth);
      }

      // 如果是开始标签（不是自闭合，不是注释，不是同行闭合）
      if (trimmed.startsWith('<') &&
          !trimmed.startsWith('</') &&
          !trimmed.startsWith('<!--') &&
          !trimmed.endsWith('/>') &&
          !this.isSameLineTag(trimmed)) {

        if (trimmed.includes('>')) {
          // 完整的单行标签
          currentDepth++;
          inMultiLineTag = false;
        } else {
          // 多行标签的开始
          inMultiLineTag = true;
          multiLineTagStartDepth = currentDepth;
        }
      } else if (inMultiLineTag && trimmed.includes('>') && !trimmed.startsWith('<')) {
        // 多行标签的结束（属性行包含 >）
        // 检查是否是自闭合标签
        if (!trimmed.endsWith('/>')) {
          currentDepth++;
        }
        inMultiLineTag = false;
      }

      // 处理属性行中包含结束标签的情况（如 class="edit-btn">编辑</button>）
      if (hasClosingTag && !trimmed.startsWith('</') && isAttributeLine) {
        // 只有当这是属性行且包含结束标签时才处理
        const closingTagMatches = trimmed.match(/<\/[^>]+>/g);
        if (closingTagMatches) {
          currentDepth = Math.max(0, currentDepth - closingTagMatches.length);
        }
      }
    }

    return depths;
  }

  private formatTextTags(text: string): string {
    const config = this.getConfiguration();

    // 将内联标签及其内容保持在同一行
    config.inlineTags.forEach(tagName => {
      text = text.replace(
        new RegExp(`(\\s*)<${tagName}([^>]*)>\\s*([^<]*?)\\s*<\\/${tagName}>`, 'g'),
        (match, indent, attrs, content) => {
          // 保持原有缩进，但标签内容不换行
          const trimmedContent = content.trim();
          return `${indent}<${tagName}${attrs}>${trimmedContent}</${tagName}>`;
        }
      );
    });

    return text;
  }

  private formatSelfClosingTags(text: string): string {
    const config = this.getConfiguration();
    let formatted = text;

    // 处理所有配置的自闭合标签
    config.selfClosingTags.forEach(tagName => {
      // 将成对标签转换为自闭合标签
      formatted = formatted.replace(
        new RegExp(`<${tagName}([^>]*?)>\\s*<\\/${tagName}>`, 'g'),
        (match, attrs) => {
          const trimmedAttrs = attrs.trim();
          return trimmedAttrs ? `<${tagName} ${trimmedAttrs} />` : `<${tagName} />`;
        }
      );

      // 规范化已有的自闭合标签格式
      formatted = formatted.replace(
        new RegExp(`<${tagName}([^>]*?)\\/>`, 'g'),
        (match, attrs) => {
          const trimmedAttrs = attrs.trim();
          return trimmedAttrs ? `<${tagName} ${trimmedAttrs} />` : `<${tagName} />`;
        }
      );
    });

    return formatted;
  }

  private formatMultiAttributeTags(text: string): string {
    const config = this.getConfiguration();
    let result = text;

    // 处理自闭合标签
    const selfClosingPattern = /<([\w-]+)([^>]+?)\/>/g;
    result = result.replace(selfClosingPattern, (match, tagName, attributesStr) => {
      // 解析属性
      const attrs = this.parseAttributes(attributesStr);

      // 如果属性超过配置的数量，进行换行格式化
      if (attrs.length > config.wrapAttributes) {
        return this.formatMultiLineTagPreprocess(tagName, attrs, true);
      }

      return match;
    });

    // 处理普通开始标签
    const tagPattern = /<([\w-]+)([^>]+?)>/g;
    result = result.replace(tagPattern, (match, tagName, attributesStr) => {
      // 跳过结束标签、注释
      if (
        match.startsWith('</') ||
        match.startsWith('<!--')
      ) {
        return match;
      }

      // 解析属性
      const attrs = this.parseAttributes(attributesStr);

      // 如果属性超过配置的数量，进行换行格式化
      if (attrs.length > config.wrapAttributes) {
        return this.formatMultiLineTagPreprocess(tagName, attrs, false);
      }

      return match;
    });

    return result;
  }

  private formatMultiLineTagPreprocess(tagName: string, attrs: Array<{ name: string; value: string }>, isSelfClosing: boolean = false): string {
    const config = this.getConfiguration();

    // 按照1.wxml的格式：标签名单独一行，所有属性都换行
    let result = `<${tagName}`;

    // 所有属性都换行并对齐
    for (let i = 0; i < attrs.length; i++) {
      result += `\n  ${attrs[i].name}=${attrs[i].value}`;
    }

    // 根据参数或配置决定是否自闭合
    if (isSelfClosing || config.selfClosingTags.includes(tagName)) {
      result += " />";
    } else {
      result += ">";
    }

    return result;
  }

  private parseAttributes(
    attributeString: string
  ): Array<{ name: string; value: string }> {
    const attrs: Array<{ name: string; value: string }> = [];

    // 清理属性字符串，移除多余的空白和换行
    const cleanedStr = attributeString.replace(/\s+/g, ' ').trim();

    // 改进的属性匹配正则，支持更复杂的属性值
    const attrRegex = /(\S+?)=("[^"]*"|'[^']*'|[^\s>]+)/g;
    let match;

    while ((match = attrRegex.exec(cleanedStr)) !== null) {
      attrs.push({
        name: match[1],
        value: match[2],
      });
    }

    return attrs;
  }

  private formatMultiLineTag(
    tagName: string,
    attrs: Array<{ name: string; value: string }>,
    currentIndent: string
  ): string {
    const config = this.getConfiguration();
    const additionalIndent = " ".repeat(config.indentSize);

    let result = `<${tagName}`;

    if (config.alignAttributes) {
      // 对齐属性模式：所有属性都换行并对齐
      for (let i = 0; i < attrs.length; i++) {
        result += `\n${currentIndent}${additionalIndent}${attrs[i].name}=${attrs[i].value}`;
      }
    } else {
      // 传统模式：第一个属性在同一行
      if (attrs.length > 0) {
        result += ` ${attrs[0].name}=${attrs[0].value}`;
      }

      // 其余属性换行
      for (let i = 1; i < attrs.length; i++) {
        result += `\n${currentIndent}${additionalIndent}${attrs[i].name}=${attrs[i].value}`;
      }
    }

    result += ">";

    return result;
  }

  private formatTagSeparation(text: string): string {
    const config = this.getConfiguration();
    let formatted = text;

    // 使用配置中的标签列表
    const blockTags = config.blockTags;
    const inlineTags = config.inlineTags;

    // 直接使用简单有效的方法处理所有块级标签分离
    formatted = this.separateAllBlockTags(formatted, blockTags);

    // 最后进行简单的缩进修复
    formatted = this.simpleIndentFix(formatted, config.indentSize);

    return formatted;
  }

  private simpleIndentFix(text: string, indentSize: number): string {
    const lines = text.split('\n');
    const result = [];
    let depth = 0;
    const indent = ' '.repeat(indentSize);

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) {
        result.push('');
        continue;
      }

      // 如果是结束标签，减少深度
      if (trimmed.startsWith('</')) {
        depth = Math.max(0, depth - 1);
      }

      // 应用缩进
      result.push(indent.repeat(depth) + trimmed);

      // 如果是开始标签（不是自闭合，不是注释，不是同行闭合）
      if (trimmed.startsWith('<') &&
          !trimmed.startsWith('</') &&
          !trimmed.startsWith('<!--') &&
          !trimmed.endsWith('/>') &&
          !this.isSameLineTag(trimmed)) {
        depth++;
      }
    }

    return result.join('\n');
  }

  private isSameLineTag(line: string): boolean {
    // 检查是否是同一行开始和结束的标签，如 <text>content</text>
    const match = line.match(/<([\w-]+)[^>]*>.*<\/\1>/);
    return !!match;
  }

  private separateAllBlockTags(text: string, blockTags: string[]): string {
    let formatted = text;

    // 多次迭代处理，确保所有嵌套的情况都被处理
    let previousFormatted = '';
    let iterations = 0;
    const maxIterations = 5;

    while (formatted !== previousFormatted && iterations < maxIterations) {
      previousFormatted = formatted;
      iterations++;

      // 1. 处理所有相邻的块级标签，确保它们之间有换行
      // 使用全局替换，处理 </tag><tag> 模式，支持带连字符的标签名
      formatted = formatted.replace(
        /<\/([\w-]+)><([\w-]+)/g,
        (match, endTag, startTag) => {
          if (blockTags.includes(endTag) || blockTags.includes(startTag)) {
            return `</${endTag}>\n<${startTag}`;
          }
          return match;
        }
      );

      // 2. 处理开始标签后紧跟其他标签的情况
      formatted = formatted.replace(
        />(\s*)<([\w-]+)/g,
        (match, whitespace, nextTag) => {
          if (blockTags.includes(nextTag) && !whitespace.includes('\n')) {
            return `>\n<${nextTag}`;
          }
          return match;
        }
      );

      // 3. 处理行内包含多个标签的情况
      const lines = formatted.split('\n');
      const processedLines = [];

      for (const line of lines) {
        let processedLine = line;

        // 继续处理行内可能存在的相邻标签
        processedLine = processedLine.replace(
          /<\/([\w-]+)><([\w-]+)/g,
          (match, endTag, startTag) => {
            if (blockTags.includes(endTag) || blockTags.includes(startTag)) {
              return `</${endTag}>\n<${startTag}`;
            }
            return match;
          }
        );

        if (processedLine.includes('\n')) {
          processedLines.push(...processedLine.split('\n'));
        } else {
          processedLines.push(processedLine);
        }
      }

      formatted = processedLines.join('\n');
    }

    return formatted;
  }

  private ensureProperTagSeparation(text: string, blockTags: string[], inlineTags: string[]): string {
    let formatted = text;

    // 1. 处理开始标签后紧跟其他标签的情况
    formatted = formatted.replace(
      />(\s*)<([\w-]+)/g,
      (match, whitespace, nextTag) => {
        // 如果下一个标签是块级标签，且当前没有换行，则添加换行
        if (blockTags.includes(nextTag) && !whitespace.includes('\n')) {
          return `>\n<${nextTag}`;
        }
        return match;
      }
    );

    // 2. 处理结束标签后紧跟开始标签的情况
    formatted = formatted.replace(
      /<\/([\w-]+)>(\s*)<([\w-]+)/g,
      (match, endTag, whitespace, startTag) => {
        // 如果任一标签是块级标签，且当前没有换行，则添加换行
        if ((blockTags.includes(endTag) || blockTags.includes(startTag)) && !whitespace.includes('\n')) {
          return `</${endTag}>\n<${startTag}`;
        }
        return match;
      }
    );

    // 3. 多次处理，确保所有嵌套的标签都被正确分离
    let previousFormatted = '';
    let iterations = 0;
    const maxIterations = 10; // 增加迭代次数

    while (formatted !== previousFormatted && iterations < maxIterations) {
      previousFormatted = formatted;
      iterations++;

      // 处理行内连续的标签
      const lines = formatted.split('\n');
      const processedLines = [];

      for (const line of lines) {
        let processedLine = line;

        // 处理行内连续的结束标签和开始标签
        processedLine = processedLine.replace(
          /<\/([\w-]+)><([\w-]+)/g,
          (match, endTag, startTag) => {
            // 如果任一标签是块级标签，则换行
            if (blockTags.includes(endTag) || blockTags.includes(startTag)) {
              return `</${endTag}>\n<${startTag}`;
            }
            return match;
          }
        );

        // 处理开始标签后紧跟其他开始标签
        processedLine = processedLine.replace(
          />(\s*)<([\w-]+)/g,
          (match, whitespace, nextTag) => {
            if (blockTags.includes(nextTag) && !whitespace.includes('\n')) {
              return `>\n<${nextTag}`;
            }
            return match;
          }
        );

        // 处理开始标签内容后紧跟结束标签的情况
        processedLine = processedLine.replace(
          />([^<\n]+)<\/([\w-]+)/g,
          (match, content, endTag) => {
            // 如果内容很短且是简单文本，保持在同一行
            if (content.trim().length < 50 && !content.includes('{{')) {
              return match;
            }
            // 否则换行
            if (blockTags.includes(endTag)) {
              return `>${content}\n</${endTag}`;
            }
            return match;
          }
        );

        // 如果处理后包含换行符，需要分割
        if (processedLine.includes('\n')) {
          const splitLines = processedLine.split('\n');
          processedLines.push(...splitLines);
        } else {
          processedLines.push(processedLine);
        }
      }

      formatted = processedLines.join('\n');
    }

    return formatted;
  }

  private separateAdjacentBlockTags(text: string, blockTags: string[]): string {
    let formatted = text;

    // 简单直接的方法：使用全局替换处理相邻的块级标签
    for (const tag of blockTags) {
      // 处理相同标签的相邻情况，如 </swiper-item><swiper-item>
      const sameTagPattern = new RegExp(`<\\/${tag}><${tag}`, 'g');
      formatted = formatted.replace(sameTagPattern, `</${tag}>\n<${tag}`);

      // 处理不同块级标签的相邻情况
      for (const otherTag of blockTags) {
        if (tag !== otherTag) {
          const diffTagPattern = new RegExp(`<\\/${tag}><${otherTag}`, 'g');
          formatted = formatted.replace(diffTagPattern, `</${tag}>\n<${otherTag}`);
        }
      }
    }

    return formatted;
  }

  private fixIndentation(text: string, indentSize: number): string {
    const lines = text.split('\n');
    const result = [];
    let currentIndent = 0;
    const indentStr = ' '.repeat(indentSize);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) {
        result.push('');
        continue;
      }

      // 分析当前行的标签情况
      const analysis = this.analyzeLineForIndentation(line);

      // 如果有结束标签，先减少缩进
      if (analysis.hasClosingTag) {
        currentIndent = Math.max(0, currentIndent - analysis.closingTagCount);
      }

      // 应用当前缩进
      const indentedLine = indentStr.repeat(currentIndent) + line;
      result.push(indentedLine);

      // 如果有开始标签，增加缩进
      if (analysis.hasOpeningTag) {
        currentIndent += analysis.openingTagCount;
      }
    }

    return result.join('\n');
  }

  private analyzeLineForIndentation(line: string): {
    hasOpeningTag: boolean;
    hasClosingTag: boolean;
    openingTagCount: number;
    closingTagCount: number;
  } {
    let openingTagCount = 0;
    let closingTagCount = 0;

    // 匹配所有的开始标签（不包括自闭合标签和注释）
    const openingTags = line.match(/<(?!\/)[^>]*(?<!\/)\>/g) || [];
    for (const tag of openingTags) {
      // 排除注释和自闭合标签
      if (!tag.includes('<!--') && !tag.endsWith('/>')) {
        // 检查是否是完整的开始标签（不是多行标签的一部分）
        if (tag.includes('>')) {
          openingTagCount++;
        }
      }
    }

    // 匹配所有的结束标签
    const closingTags = line.match(/<\/[^>]+>/g) || [];
    closingTagCount = closingTags.length;

    // 检查同一行的开始和结束标签（如 <text>content</text>）
    const sameLineMatches = line.match(/<([\w-]+)[^>]*>.*?<\/\1>/g) || [];
    // 对于同一行的开始和结束标签，不改变缩进
    openingTagCount -= sameLineMatches.length;
    closingTagCount -= sameLineMatches.length;

    return {
      hasOpeningTag: openingTagCount > 0,
      hasClosingTag: closingTagCount > 0,
      openingTagCount,
      closingTagCount
    };
  }

  private sortTagAttributes(text: string): string {
    const config = this.getConfiguration();

    if (!config.sortAttributes) {
      return text;
    }

    // 属性排序优先级
    const attributePriority: { [key: string]: number } = {
      'id': 1,
      'class': 2,
      'style': 3,
      'wx:if': 10,
      'wx:elif': 11,
      'wx:else': 12,
      'wx:for': 20,
      'wx:for-item': 21,
      'wx:for-index': 22,
      'wx:key': 23,
      'src': 30,
      'mode': 31,
      'data-': 40, // data-* 属性
      'bind:': 50, // 事件绑定
      'catch:': 51,
      'capture-bind:': 52,
      'capture-catch:': 53,
    };

    return text.replace(
      /<([\w-]+)([^>]+)>/g,
      (match, tagName, attributesStr) => {
        if (attributesStr.includes('/>')) {
          return match; // 跳过自闭合标签
        }

        const attrs = this.parseAttributes(attributesStr);
        if (attrs.length <= 1) {
          return match; // 单个或无属性不需要排序
        }

        // 排序属性
        attrs.sort((a, b) => {
          const getPriority = (attrName: string) => {
            // 检查精确匹配
            if (attributePriority[attrName]) {
              return attributePriority[attrName];
            }

            // 检查前缀匹配
            for (const prefix in attributePriority) {
              if (prefix.endsWith('-') && attrName.startsWith(prefix)) {
                return attributePriority[prefix];
              }
              if (prefix.endsWith(':') && attrName.startsWith(prefix)) {
                return attributePriority[prefix];
              }
            }

            return 100; // 默认优先级
          };

          const priorityA = getPriority(a.name);
          const priorityB = getPriority(b.name);

          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }

          // 相同优先级按字母顺序排序
          return a.name.localeCompare(b.name);
        });

        // 重新构建标签
        const sortedAttrs = attrs.map(attr => `${attr.name}=${attr.value}`).join(' ');
        return `<${tagName} ${sortedAttrs}>`;
      }
    );
  }

  private forceBlockTagSeparation(text: string): string {
    const config = this.getConfiguration();
    let formatted = text;

    // 获取所有块级标签
    const blockTags = config.blockTags;

    // 简单直接的方法：只处理换行，不重新处理缩进
    // 处理 </tag><tag> 模式，支持带连字符的标签名
    for (const endTag of blockTags) {
      for (const startTag of blockTags) {
        // 创建精确的模式匹配，保持原有缩进
        const pattern = new RegExp(`<\\/${endTag}>(\s*)<${startTag}`, 'g');
        formatted = formatted.replace(pattern, (match, whitespace) => {
          // 如果没有换行符，添加换行并保持缩进
          if (!whitespace.includes('\n')) {
            // 获取当前行的缩进
            const lines = formatted.substring(0, formatted.indexOf(match)).split('\n');
            const lastLine = lines[lines.length - 1];
            const indentMatch = lastLine.match(/^(\s*)/);
            const currentIndent = indentMatch ? indentMatch[1] : '';

            return `</${endTag}>\n${currentIndent}<${startTag}`;
          }
          return match;
        });
      }
    }

    return formatted;
  }
}
