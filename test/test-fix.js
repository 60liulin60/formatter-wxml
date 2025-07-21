const fs = require('fs');

// 模拟 vscode 模块
const vscode = {
  workspace: {
    getConfiguration: (section) => ({
      get: (key, defaultValue) => {
        const config = {
          'indentSize': 2,
          'maxLineLength': 120,
          'preserveNewlines': true,
          'wrapAttributes': 3,
          'alignAttributes': true,
          'sortAttributes': false,
          'selfClosingTags': ['image', 'input', 'icon'],
          'inlineTags': ['text', 'icon'],
          'blockTags': [
            'view', 'scroll-view', 'swiper', 'swiper-item', 'form', 'button',
            'navigator', 'picker', 'picker-view', 'slider', 'switch', 'textarea'
          ]
        };
        return config[key] !== undefined ? config[key] : defaultValue;
      }
    })
  }
};

global.vscode = vscode;
const { WXMLFormatter } = require('../out/formatter.js');

// 测试

  postprocessWXML(text) {
    let processed = text;

    // 恢复双花括号表达式
    if (this._expressions) {
      this._expressions.forEach((expr, index) => {
        processed = processed.replace(new RegExp(`__EXPR_${index}__`, 'g'), expr);
      });
    }

    // 清理临时存储
    delete this._expressions;
    delete this._directives;

    // 格式化WXML特有的属性
    processed = this.formatWXMLAttributes(processed);

    return processed;
  }

  formatWXMLAttributes(text) {
    let formatted = text;

    // 确保wx:属性的格式正确
    formatted = formatted.replace(
      /(wx:|bind:|catch:|capture-bind:|capture-catch:)(\w+)(\s*=\s*)(['"])/g,
      "$1$2=$4"
    );

    return formatted;
  }

  applyCustomRules(text) {
    let formatted = text;

    // 1. 处理属性超过指定数量的标签换行
    formatted = this.formatMultiAttributeTags(formatted);

    // 2. 处理标签之间的换行
    formatted = this.formatTagSeparation(formatted);

    // 3. 处理自闭合标签
    formatted = this.formatSelfClosingTags(formatted);

    return formatted;
  }

  formatTagSeparation(text) {
    const config = this.getConfiguration();
    let formatted = text;

    // 处理相邻标签之间的换行，保持缩进
    const lines = formatted.split('\n');
    const result = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 检查是否有多个标签在同一行
      const tagMatches = line.match(/>(<[^>]+>)/g);
      if (tagMatches && tagMatches.length > 0) {
        // 获取当前行的缩进
        const indentMatch = line.match(/^(\s*)/);
        const currentIndent = indentMatch ? indentMatch[1] : '';

        // 分割标签
        let processedLine = line;
        tagMatches.forEach(match => {
          const tag = match.substring(1); // 移除开头的 >
          processedLine = processedLine.replace(match, `>\n${currentIndent}${tag}`);
        });

        result.push(processedLine);
      } else {
        result.push(line);
      }
    }

    return result.join('\n');
  }

  formatSelfClosingTags(text) {
    const config = this.getConfiguration();
    let formatted = text;

    // 处理自闭合标签
    config.selfClosingTags.forEach(tagName => {
      // 将 <tag></tag> 转换为 <tag />
      const regex = new RegExp(`<${tagName}([^>]*?)><\/${tagName}>`, 'g');
      formatted = formatted.replace(regex, `<${tagName}$1 />`);
    });

    return formatted;
  }

  formatMultiAttributeTags(text) {
    const config = this.getConfiguration();
    const lines = text.split('\n');
    const result = [];
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      
      // 检查是否是标签开始行
      const tagStartMatch = line.match(/^(\s*)<(\w+)(.*)$/);
      if (tagStartMatch) {
        const [, indent, tagName, restOfLine] = tagStartMatch;
        
        // 收集完整的标签（可能跨多行）
        let fullTag = line;
        let j = i + 1;
        
        // 如果当前行没有闭合标签，继续收集后续行
        while (j < lines.length && !fullTag.includes('>')) {
          fullTag += '\n' + lines[j];
          j++;
        }
        
        // 提取标签内容
        const tagMatch = fullTag.match(/^(\s*)<(\w+)([^>]*?)>/s);
        if (tagMatch) {
          const [, currentIndent, tagName, attributesStr] = tagMatch;
          
          // 跳过自闭合标签和内联标签
          if (
            attributesStr.includes("/>") ||
            config.inlineTags.includes(tagName) ||
            config.selfClosingTags.includes(tagName)
          ) {
            // 添加原始行
            for (let k = i; k < j; k++) {
              result.push(lines[k]);
            }
          } else {
            // 解析属性
            const attrs = this.parseAttributes(attributesStr);
            
            // 如果属性超过配置的数量，进行换行格式化
            if (attrs.length > config.wrapAttributes) {
              const formattedTag = this.formatMultiLineTag(tagName, attrs, currentIndent);
              result.push(formattedTag);
            } else {
              // 添加原始行
              for (let k = i; k < j; k++) {
                result.push(lines[k]);
              }
            }
          }
          
          i = j;
        } else {
          result.push(line);
          i++;
        }
      } else {
        result.push(line);
        i++;
      }
    }
    
    return result.join('\n');
  }

  parseAttributes(attributeString) {
    const attrs = [];
    
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

  formatMultiLineTag(tagName, attrs, currentIndent) {
    const config = this.getConfiguration();
    const additionalIndent = " ".repeat(config.indentSize);

    let result = `${currentIndent}<${tagName}`;

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

  fixIndentation(text, indentSize) {
    const lines = text.split('\n');
    const result = [];
    let depth = 0;
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

      // 如果是结束标签，先减少深度
      if (trimmed.startsWith('</')) {
        depth = Math.max(0, depth - 1);
      }

      if (isAttributeLine) {
        // 属性行使用额外的缩进
        result.push(indent.repeat(depth + 1) + trimmed);
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

        // 只有当标签完整结束时才增加深度
        if (trimmed.includes('>')) {
          depth++;
        }
      }
    }

    return result.join('\n');
  }

  isSameLineTag(line) {
    // 检查是否是同一行开始和结束的标签，如 <text>content</text>
    const match = line.match(/<(\w+)[^>]*>.*<\/\1>/);
    return !!match;
  }
}

// 测试
const formatter = new WXMLFormatter();
const input = fs.readFileSync('./test/examples/complex.wxml', 'utf8');
const output = formatter.format(input);
fs.writeFileSync('./test/output/2.wxml', output);
console.log('已更新 2.wxml');
console.log('格式化结果:');
console.log(output);
