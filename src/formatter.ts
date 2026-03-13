import * as vscode from "vscode";

interface FormatterConfig {
  indentSize: number;
  maxLineLength: number;
  preserveNewlines: boolean;
  wrapAttributes: number;
  alignAttributes: boolean;
  sortAttributes: boolean;
  selfClosingTags: string[];
  inlineTags: string[];
  blockTags: string[];
}

interface ParsedAttribute {
  name: string;
  value: string;
}

interface Token {
  type: 'open' | 'close' | 'selfClose' | 'text' | 'comment';
  content: string;
  tagName?: string;
  attributes?: ParsedAttribute[];
  originalLength?: number; // 保存原始长度（保护语法之前）
}

// 占位符常量
const EXPR_PLACEHOLDER = "__WXML_EXPR_";
const DIR_PLACEHOLDER = "__WXML_DIR_";

export class WXMLFormatter {
  private expressions: string[] = [];
  private directives: string[] = [];

  private getConfiguration(): FormatterConfig {
    const config = vscode.workspace.getConfiguration("wxml-formatter");
    return {
      indentSize: config.get<number>("indentSize", 2),
      maxLineLength: config.get<number>("maxLineLength", 120),
      preserveNewlines: config.get<boolean>("preserveNewlines", true),
      wrapAttributes: config.get<number>("wrapAttributes", 3),
      alignAttributes: config.get<boolean>("alignAttributes", true),
      sortAttributes: config.get<boolean>("sortAttributes", false),
      selfClosingTags: config.get<string[]>("selfClosingTags", [
        "image", "input", "icon", "video", "audio", "camera",
        "live-player", "live-pusher", "map", "canvas", "web-view",
        "ad", "official-account", "open-data"
      ]),
      inlineTags: config.get<string[]>("inlineTags", ["text", "icon", "rich-text"]),
      blockTags: config.get<string[]>("blockTags", [
        "view", "scroll-view", "swiper", "swiper-item", "movable-area", "movable-view",
        "cover-view", "cover-image", "page-container", "share-element",
        "form", "picker", "picker-view", "picker-view-column", "slider", "switch", "textarea",
        "navigator", "functional-page-navigator", "live-player", "live-pusher",
        "map", "canvas", "web-view", "ad", "official-account", "open-data",
        "rich-text", "progress", "button", "checkbox", "radio", "label",
        "editor", "keyboard-accessory", "match-media", "page-meta", "navigation-bar",
        "custom-tab-bar", "voip-room", "subscribe", "favorites", "block",
        "template", "import", "include", "wxs", "slot"
      ]),
    };
  }

  public format(text: string): string {
    try {
      this.expressions = [];
      this.directives = [];

      const config = this.getConfiguration();

      // 在保护语法之前，记录原始标签长度
      const originalLengths = this.recordOriginalLengths(text);

      // 1. 保护特殊语法
      let result = this.protectSpecialSyntax(text);

      // 2. 处理自闭合标签
      result = this.normalizeSelfClosingTags(result, config.selfClosingTags);

      // 3. 解析为token
      const tokens = this.tokenize(result);

      // 4. 添加原始长度信息到 token
      this.attachOriginalLengths(tokens, originalLengths);

      // 5. 构建格式化文档
      result = this.buildDocument(tokens, config);

      // 6. 恢复特殊语法
      result = this.restoreSpecialSyntax(result);

      // 7. 最终清理
      result = this.finalCleanup(result);

      return result;
    } catch (error) {
      throw new Error(`Failed to format WXML: ${error}`);
    }
  }

  /** 记录原始标签长度（保护语法之前） */
  private recordOriginalLengths(text: string): Map<string, number> {
    const lengths = new Map<string, number>();
    const regex = /<([\w-]+)[^>]*>/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      lengths.set(`${match[1]}_${match.index}`, match[0].length);
    }

    return lengths;
  }

  /** 将原始长度信息附加到 token */
  private attachOriginalLengths(tokens: Token[], lengths: Map<string, number>): void {
    let position = 0;
    for (const token of tokens) {
      if ((token.type === 'open' || token.type === 'selfClose') && token.tagName) {
        const key = `${token.tagName}_${position}`;
        if (lengths.has(key)) {
          token.originalLength = lengths.get(key);
        }
      }
      position += token.content.length;
    }
  }

  private protectSpecialSyntax(text: string): string {
    let result = text;

    // 保护双花括号表达式
    result = result.replace(/\{\{[^}]*(?:\{[^}]*\}[^}]*)*\}\}/g, (match) => {
      const index = this.expressions.length;
      this.expressions.push(match);
      return `${EXPR_PLACEHOLDER}${index}__`;
    });

    // 保护WXML指令
    result = result.replace(/(wx:|bind:|catch:|capture-bind:|capture-catch:)[\w-]+/g, (match) => {
      const index = this.directives.length;
      this.directives.push(match);
      return `${DIR_PLACEHOLDER}${index}__`;
    });

    return result;
  }

  private restoreSpecialSyntax(text: string): string {
    let result = text;

    result = result.replace(new RegExp(`${DIR_PLACEHOLDER}(\\d+)__`, 'g'), (_, index) => {
      return this.directives[parseInt(index)] || _;
    });

    result = result.replace(new RegExp(`${EXPR_PLACEHOLDER}(\\d+)__`, 'g'), (_, index) => {
      return this.expressions[parseInt(index)] || _;
    });

    return result;
  }

  private normalizeSelfClosingTags(text: string, selfClosingTags: string[]): string {
    let result = text;

    for (const tagName of selfClosingTags) {
      // 成对标签转自闭合（使用单词边界确保完整标签名匹配）
      // 注意：(?=[\s/>]) 确保标签名后必须是空格、/ 或 >，避免匹配到前缀相同的标签
      result = result.replace(
        new RegExp(`<${tagName}(?=[\\s/>])(\\s[^>]*?)?></${tagName}>`, 'g'),
        (_, attrs) => `<${tagName}${attrs || ''} />`
      );

      // 规范化自闭合标签格式（确保标签名后是空格才能匹配）
      result = result.replace(
        new RegExp(`<${tagName}(?=\\s)(\\s[^>]*)\\s*/>`, 'g'),
        (_, attrs) => {
          const trimmed = attrs.trim();
          return trimmed ? `<${tagName} ${trimmed} />` : `<${tagName} />`;
        }
      );
    }

    return result;
  }

  /** 从标签内容提取标签名 */
  private extractTagName(content: string): string {
    return content.match(/<[\/]?([\w-]+)/)?.[1] || '';
  }

  private tokenize(text: string): Token[] {
    const tokens: Token[] = [];
    const cleaned = text.replace(/\s+/g, ' ').trim();
    
    const regex = /<!\-\-[\s\S]*?\-\->|<\/[\w-]+\s*>|<[\w-]+[^>]*\/\s*>|<[\w-]+[^>]*\s*>|[^<]+|</g;
    let match;

    while ((match = regex.exec(cleaned)) !== null) {
      const raw = match[0].trim();
      if (!raw) continue;

      const content = raw.startsWith('<')
        ? raw.replace(/\/\s*>$/, '/>').replace(/\s+>$/, '>')
        : raw;

      if (content.startsWith('<!--')) {
        tokens.push({ type: 'comment', content });
      } else if (content === '<') {
        tokens.push({ type: 'text', content });
      } else if (content.startsWith('</')) {
        tokens.push({ type: 'close', content, tagName: this.extractTagName(content) });
      } else if (/\/>$/.test(content)) {
        const tagName = this.extractTagName(content);
        if (!tagName) {
          tokens.push({ type: 'text', content });
          continue;
        }
        tokens.push({
          type: 'selfClose',
          content,
          tagName,
          attributes: this.parseAttributes(content.slice(tagName.length + 1, -2))
        });
      } else if (content.startsWith('<')) {
        const tagName = this.extractTagName(content);
        if (!tagName) {
          tokens.push({ type: 'text', content });
          continue;
        }
        tokens.push({
          type: 'open',
          content,
          tagName,
          attributes: this.parseAttributes(content.slice(tagName.length + 1, -1))
        });
      } else {
        tokens.push({ type: 'text', content });
      }
    }

    return tokens;
  }

  private buildDocument(tokens: Token[], config: FormatterConfig): string {
    const lines: string[] = [];
    const indent = ' '.repeat(config.indentSize);
    let depth = 0;

    // 判断是否需要多行显示：属性数量 >= 3 或 标签长度 > 100
    const shouldWrapAttributes = (token: Token): boolean => {
      if (!token.attributes || token.attributes.length === 0) return false;
      if (token.attributes.length >= config.wrapAttributes) return true;
      if (token.originalLength && token.originalLength > 100) return true;
      return false;
    };

    // 格式化属性字符串
    const formatAttr = (attr: ParsedAttribute): string => 
      attr.value ? `${attr.name}=${attr.value}` : attr.name;

    // 检查是否为内联标签的三明治结构（<tag>text</tag>）
    const isInlineSandwich = (token: Token, next: Token | undefined, nextNext: Token | undefined): boolean =>
      next?.type === 'text' &&
      nextNext?.type === 'close' &&
      nextNext.tagName === token.tagName;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const nextToken = tokens[i + 1];
      const nextNextToken = tokens[i + 2];

      // 处理结束标签
      if (token.type === 'close') {
        depth = Math.max(0, depth - 1);
        lines.push(indent.repeat(depth) + token.content);
        continue;
      }

      // 处理 text 标签的多属性换行（内联输出）
      if (
        token.type === 'open' &&
        token.tagName === 'text' &&
        shouldWrapAttributes(token) &&
        isInlineSandwich(token, nextToken, nextNextToken)
      ) {
        lines.push(indent.repeat(depth) + `<${token.tagName}`);
        for (const attr of token.attributes ?? []) {
          lines.push(indent.repeat(depth + 1) + formatAttr(attr));
        }
        lines.push(indent.repeat(depth) + `>${nextToken!.content}${nextNextToken!.content}`);
        i += 2;
        continue;
      }

      // 处理多属性开始标签
      if (token.type === 'open' && shouldWrapAttributes(token)) {
        const isInlineTag = config.inlineTags.includes(token.tagName || '');
        const shouldInline = isInlineTag && isInlineSandwich(token, nextToken, nextNextToken);

        lines.push(indent.repeat(depth) + `<${token.tagName}`);
        const attrs = token.attributes!;
        const lastIndex = attrs.length - 1;
        
        for (let j = 0; j <= lastIndex; j++) {
          const attrStr = formatAttr(attrs[j]!);
          if (j === lastIndex && shouldInline) {
            lines.push(indent.repeat(depth + 1) + `${attrStr}>${nextToken!.content}${nextNextToken!.content}`);
          } else {
            lines.push(indent.repeat(depth + 1) + attrStr);
          }
        }

        if (shouldInline) {
          i += 2;
          continue;
        }
        lines.push(indent.repeat(depth) + '>');
        depth++;
        continue;
      }

      // 处理内联标签和短文本标签（保持同行）
      if (
        token.type === 'open' &&
        isInlineSandwich(token, nextToken, nextNextToken) &&
        (config.inlineTags.includes(token.tagName || '') || nextToken!.content.length <= 50)
      ) {
        lines.push(indent.repeat(depth) + token.content + nextToken!.content + nextNextToken!.content);
        i += 2;
        continue;
      }

      // 处理多属性自闭合标签
      if (token.type === 'selfClose' && shouldWrapAttributes(token)) {
        lines.push(indent.repeat(depth) + `<${token.tagName}`);
        const attrs = token.attributes!;
        const lastIndex = attrs.length - 1;
        
        for (let j = 0; j <= lastIndex; j++) {
          const attrStr = formatAttr(attrs[j]!);
          const suffix = j === lastIndex ? ' />' : '';
          lines.push(indent.repeat(depth + 1) + attrStr + suffix);
        }
        continue;
      }

      // 普通token
      lines.push(indent.repeat(depth) + token.content);

      // 开始标签增加深度
      if (token.type === 'open') {
        depth++;
      }
    }

    return lines.join('\n') + '\n';
  }

  private parseAttributes(attrString: string): ParsedAttribute[] {
    const attrs: ParsedAttribute[] = [];
    const cleaned = attrString.replace(/\s+/g, ' ').trim();
    
    if (!cleaned) return attrs;
    
    // 支持普通属性、占位符属性和布尔属性
    // 匹配: name="value" 或 name='value' 或 name (布尔属性)
    const regex = /([\w-:]+|__WXML_\w+_\d+__)(?:=("[^"]*"|'[^']*'))?/g;
    let match;

    while ((match = regex.exec(cleaned)) !== null) {
      const name = match[1];
      const value = match[2] || ''; // 布尔属性没有值
      attrs.push({ name, value });
    }

    return attrs;
  }

  private finalCleanup(text: string): string {
    let result = text;

    // 修复标签名和属性粘连
    result = result.replace(/<([\w-]+)([a-zA-Z][^=\s>]*=)/g, '<$1 $2');

    // 规范化属性格式
    result = result.replace(
      /(wx:|bind:|catch:|capture-bind:|capture-catch:)(\w+)(\s*=\s*)(['"])/g,
      '$1$2=$4'
    );

    return result;
  }
}
