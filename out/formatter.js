"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WXMLFormatter = void 0;
const vscode = require("vscode");
// 占位符常量
const EXPR_PLACEHOLDER = "__WXML_EXPR_";
const DIR_PLACEHOLDER = "__WXML_DIR_";
class WXMLFormatter {
    constructor() {
        this.expressions = [];
        this.directives = [];
    }
    getConfiguration() {
        const config = vscode.workspace.getConfiguration("wxml-formatter");
        return {
            indentSize: config.get("indentSize", 2),
            maxLineLength: config.get("maxLineLength", 120),
            preserveNewlines: config.get("preserveNewlines", true),
            wrapAttributes: config.get("wrapAttributes", 3),
            alignAttributes: config.get("alignAttributes", true),
            sortAttributes: config.get("sortAttributes", false),
            selfClosingTags: config.get("selfClosingTags", [
                "image", "input", "icon", "video", "audio", "camera",
                "live-player", "live-pusher", "map", "canvas", "web-view",
                "ad", "official-account", "open-data"
            ]),
            inlineTags: config.get("inlineTags", ["text", "icon", "rich-text"]),
            blockTags: config.get("blockTags", [
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
    format(text) {
        try {
            this.expressions = [];
            this.directives = [];
            const config = this.getConfiguration();
            // 1. 保护特殊语法
            let result = this.protectSpecialSyntax(text);
            // 2. 处理自闭合标签
            result = this.normalizeSelfClosingTags(result, config.selfClosingTags);
            // 3. 解析为token
            const tokens = this.tokenize(result);
            // 4. 构建格式化文档
            result = this.buildDocument(tokens, config);
            // 5. 恢复特殊语法
            result = this.restoreSpecialSyntax(result);
            // 6. 最终清理
            result = this.finalCleanup(result);
            return result;
        }
        catch (error) {
            throw new Error(`Failed to format WXML: ${error}`);
        }
    }
    protectSpecialSyntax(text) {
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
    restoreSpecialSyntax(text) {
        let result = text;
        result = result.replace(new RegExp(`${DIR_PLACEHOLDER}(\\d+)__`, 'g'), (_, index) => {
            return this.directives[parseInt(index)] || _;
        });
        result = result.replace(new RegExp(`${EXPR_PLACEHOLDER}(\\d+)__`, 'g'), (_, index) => {
            return this.expressions[parseInt(index)] || _;
        });
        return result;
    }
    normalizeSelfClosingTags(text, selfClosingTags) {
        let result = text;
        for (const tagName of selfClosingTags) {
            // 成对标签转自闭合
            result = result.replace(new RegExp(`<${tagName}(\\s[^>]*?)?><\\/${tagName}>`, 'g'), (_, attrs) => `<${tagName}${attrs || ''} />`);
            // 规范化格式
            result = result.replace(new RegExp(`<${tagName}([^>]*?)\\s*/>`, 'g'), (_, attrs) => {
                const trimmed = attrs.trim();
                return trimmed ? `<${tagName} ${trimmed} />` : `<${tagName} />`;
            });
        }
        return result;
    }
    tokenize(text) {
        const tokens = [];
        const cleaned = text.replace(/\s+/g, ' ').trim();
        const regex = /<!\-\-[\s\S]*?\-\->|<\/[\w-]+>|<[\w-]+[^>]*\/>|<[\w-]+[^>]*>|[^<]+/g;
        let match;
        while ((match = regex.exec(cleaned)) !== null) {
            const content = match[0].trim();
            if (!content)
                continue;
            if (content.startsWith('<!--')) {
                tokens.push({ type: 'comment', content });
            }
            else if (content.startsWith('</')) {
                const tagName = content.match(/<\/([\w-]+)/)?.[1] || '';
                tokens.push({ type: 'close', content, tagName });
            }
            else if (content.endsWith('/>')) {
                const tagName = content.match(/<([\w-]+)/)?.[1] || '';
                const attrStr = content.slice(tagName.length + 1, -2);
                tokens.push({
                    type: 'selfClose',
                    content,
                    tagName,
                    attributes: this.parseAttributes(attrStr)
                });
            }
            else if (content.startsWith('<')) {
                const tagName = content.match(/<([\w-]+)/)?.[1] || '';
                const attrStr = content.slice(tagName.length + 1, -1);
                tokens.push({
                    type: 'open',
                    content,
                    tagName,
                    attributes: this.parseAttributes(attrStr)
                });
            }
            else {
                tokens.push({ type: 'text', content });
            }
        }
        return tokens;
    }
    buildDocument(tokens, config) {
        const lines = [];
        const indent = ' '.repeat(config.indentSize);
        let depth = 0;
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
            // 处理多属性开始标签（优先级高于短文本）
            if (token.type === 'open' &&
                token.attributes &&
                token.attributes.length > config.wrapAttributes) {
                lines.push(indent.repeat(depth) + `<${token.tagName}`);
                for (let j = 0; j < token.attributes.length; j++) {
                    const attr = token.attributes[j];
                    const isLast = j === token.attributes.length - 1;
                    lines.push(indent.repeat(depth + 1) + `${attr.name}=${attr.value}${isLast ? '>' : ''}`);
                }
                depth++;
                continue;
            }
            // 处理内联标签：<tag>text</tag> 保持同行
            if (token.type === 'open' &&
                config.inlineTags.includes(token.tagName || '') &&
                nextToken?.type === 'text' &&
                nextNextToken?.type === 'close' &&
                nextNextToken.tagName === token.tagName) {
                lines.push(indent.repeat(depth) + token.content + nextToken.content + nextNextToken.content);
                i += 2;
                continue;
            }
            // 处理标签内的简短文本：<tag>短文本</tag> 保持同行
            if (token.type === 'open' &&
                nextToken?.type === 'text' &&
                nextNextToken?.type === 'close' &&
                nextNextToken.tagName === token.tagName &&
                nextToken.content.length <= 50) {
                lines.push(indent.repeat(depth) + token.content + nextToken.content + nextNextToken.content);
                i += 2;
                continue;
            }
            // 处理多属性自闭合标签
            if (token.type === 'selfClose' &&
                token.attributes &&
                token.attributes.length > config.wrapAttributes) {
                lines.push(indent.repeat(depth) + `<${token.tagName}`);
                for (let j = 0; j < token.attributes.length; j++) {
                    const attr = token.attributes[j];
                    const isLast = j === token.attributes.length - 1;
                    lines.push(indent.repeat(depth + 1) + `${attr.name}=${attr.value}${isLast ? ' />' : ''}`);
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
    parseAttributes(attrString) {
        const attrs = [];
        const cleaned = attrString.replace(/\s+/g, ' ').trim();
        if (!cleaned)
            return attrs;
        // 支持普通属性和占位符属性（如 __WXML_DIR_0__="value"）
        const regex = /([\w-:]+|__WXML_\w+_\d+__)=("[^"]*"|'[^']*')/g;
        let match;
        while ((match = regex.exec(cleaned)) !== null) {
            attrs.push({ name: match[1], value: match[2] });
        }
        return attrs;
    }
    finalCleanup(text) {
        let result = text;
        // 修复标签名和属性粘连
        result = result.replace(/<([\w-]+)([a-zA-Z][^=\s>]*=)/g, '<$1 $2');
        // 规范化属性格式
        result = result.replace(/(wx:|bind:|catch:|capture-bind:|capture-catch:)(\w+)(\s*=\s*)(['"])/g, '$1$2=$4');
        return result;
    }
}
exports.WXMLFormatter = WXMLFormatter;
//# sourceMappingURL=formatter.js.map