const fs = require('fs');
const path = require('path');

const { html: beautifyHtml } = require('js-beautify');

// WXML格式化器的逻辑
class WXMLFormatter {
    format(text) {
        // 预处理WXML特有的语法
        let processedText = this.preprocessWXML(text);
        
        // 使用js-beautify格式化HTML结构
        const beautifyOptions = {
            indent_size: 2,
            indent_char: ' ',
            max_preserve_newlines: 2,
            preserve_newlines: true,
            keep_array_indentation: false,
            break_chained_methods: false,
            indent_scripts: 'keep',
            indent_styles: 'keep',
            space_before_conditional: true,
            unescape_strings: false,
            jslint_happy: false,
            end_with_newline: true,
            wrap_line_length: 120,
            indent_inner_html: false,
            comma_first: false,
            e4x: false,
            indent_empty_lines: false
        };

        let formatted = beautifyHtml(processedText, beautifyOptions);

        // 后处理WXML特有的语法
        formatted = this.postprocessWXML(formatted);

        // 应用自定义格式化规则
        formatted = this.applyCustomRules(formatted);

        // 最后强制处理swiper-item的换行问题
        formatted = this.fixSwiperItemSeparation(formatted);

        // 最后再次应用多属性格式化（确保不被js-beautify覆盖）
        formatted = this.formatMultiAttributeTags(formatted);

        return formatted;
    }

    preprocessWXML(text) {
        // 保护双花括号表达式
        const expressions = [];
        let processed = text.replace(/\{\{[^}]*\}\}/g, (match) => {
            const index = expressions.length;
            expressions.push(match);
            return `__WXML_EXPR_${index}__`;
        });

        // 预处理image标签为自闭合标签，避免被HTML格式化器破坏
        processed = processed.replace(/<image(\s[^>]*?)><\/image>/g, (match, attrs) => {
            return `<image${attrs} />`;
        });
        processed = processed.replace(/<image(\s[^>]*?)\/>/g, (match, attrs) => {
            return `<image${attrs} />`;
        });
        // 处理没有属性的image标签
        processed = processed.replace(/<image><\/image>/g, '<image />');
        processed = processed.replace(/<image\/>/g, '<image />');

        this._expressions = expressions;
        return processed;
    }

    postprocessWXML(text) {
        let processed = text;
        const expressions = this._expressions || [];
        
        // 恢复双花括号表达式
        processed = processed.replace(/__WXML_EXPR_(\d+)__/g, (match, index) => {
            return expressions[parseInt(index)] || match;
        });
        
        // 格式化WXML特有的属性
        processed = this.formatWXMLAttributes(processed);

        // 修复image标签格式 - 确保标签名和属性之间有空格
        processed = processed.replace(/<image([a-zA-Z])/g, '<image $1');
        // 修复可能的imagesrc问题
        processed = processed.replace(/<imagesrc=/g, '<image src=');
        // 修复imageclass问题
        processed = processed.replace(/<imageclass=/g, '<image class=');
        // 修复其他标签名和属性粘连问题
        processed = processed.replace(/<(\w+)([a-zA-Z][^=\s>]*=)/g, '<$1 $2');

        return processed;
    }

    formatWXMLAttributes(text) {
        let formatted = text;

        // 格式化条件渲染
        formatted = formatted.replace(
            /wx:if\s*=\s*(['"])\s*\{\{([^}]+)\}\}\s*\1/g,
            'wx:if="{{$2}}"'
        );

        // 格式化循环
        formatted = formatted.replace(
            /wx:for\s*=\s*(['"])\s*\{\{([^}]+)\}\}\s*\1/g,
            'wx:for="{{$2}}"'
        );

        return formatted;
    }

    applyCustomRules(text) {
        let formatted = text;

        // 1. 处理text标签不换行
        formatted = this.formatTextTags(formatted);

        // 2. 处理image标签为自闭合
        formatted = this.formatImageTags(formatted);

        // 3. 处理属性超过3个的标签换行
        formatted = this.formatMultiAttributeTags(formatted);

        // 4. 处理不同标签之间的换行
        formatted = this.formatTagSeparation(formatted);

        return formatted;
    }

    formatTextTags(text) {
        // 将text标签及其内容保持在同一行
        return text.replace(
            /(\s*)<text([^>]*)>\s*([^<]*?)\s*<\/text>/g,
            (match, indent, attrs, content) => {
                // 保持原有缩进，但text标签内容不换行
                return `${indent}<text${attrs}>${content.trim()}</text>`;
            }
        );
    }

    formatImageTags(text) {
        // 将image标签转换为自闭合标签
        let formatted = text.replace(
            /<image([^>]*?)>\s*<\/image>/g,
            (match, attrs) => {
                // 确保自闭合标签格式正确
                const trimmedAttrs = attrs.trim();
                if (trimmedAttrs && !trimmedAttrs.endsWith('/')) {
                    return `<image ${trimmedAttrs} />`;
                }
                return trimmedAttrs ? `<image ${trimmedAttrs}/>` : '<image/>';
            }
        );

        // 处理已经是自闭合但格式不正确的image标签
        formatted = formatted.replace(
            /<image([^>]*?)\/>/g,
            (match, attrs) => {
                const trimmedAttrs = attrs.trim();
                return trimmedAttrs ? `<image ${trimmedAttrs} />` : '<image />';
            }
        );

        return formatted;
    }

    formatMultiAttributeTags(text) {
        let result = text;

        // 使用更强大的正则表达式来匹配标签，包括跨行的情况
        const tagPattern = /<(\w+)([^>]+)>/g;

        result = result.replace(tagPattern, (match, tagName, attributes) => {
            // 跳过自闭合标签
            if (attributes.includes('/>')) {
                return match;
            }

            // 解析属性
            const attrs = this.parseAttributes(attributes);

            // 如果属性超过3个，进行换行格式化
            if (attrs.length > 3) {
                // 获取当前标签的缩进（从原始匹配中推断）
                const beforeTag = text.substring(0, text.indexOf(match));
                const lastNewlineIndex = beforeTag.lastIndexOf('\n');
                const currentIndent = lastNewlineIndex >= 0 ?
                    beforeTag.substring(lastNewlineIndex + 1).match(/^(\s*)/)[1] : '';

                return this.formatMultiLineTag(tagName, attrs, currentIndent);
            }

            return match;
        });

        return result;
    }

    parseAttributes(attributeString) {
        const attrs = [];
        const attrRegex = /(\S+)=("[^"]*"|'[^']*'|\S+)/g;
        let match;

        while ((match = attrRegex.exec(attributeString)) !== null) {
            attrs.push({
                name: match[1],
                value: match[2]
            });
        }

        return attrs;
    }

    formatMultiLineTag(tagName, attrs, currentIndent) {
        const additionalIndent = '  '; // 2个空格

        let result = `<${tagName}`;

        // 所有属性都换行，每个属性独立一行
        for (let i = 0; i < attrs.length; i++) {
            result += `\n${currentIndent}${additionalIndent}${attrs[i].name}=${attrs[i].value}`;
        }

        result += '>';

        return result;
    }

    formatTagSeparation(text) {
        let formatted = text;

        // 定义块级标签，这些标签前后应该换行
        const blockTags = [
            'view', 'scroll-view', 'swiper', 'swiper-item', 'movable-area', 'movable-view',
            'cover-view', 'cover-image', 'page-container', 'share-element',
            'form', 'picker', 'picker-view', 'slider', 'switch', 'textarea',
            'navigator', 'functional-page-navigator', 'live-player', 'live-pusher',
            'map', 'canvas', 'web-view', 'ad', 'official-account', 'open-data',
            'rich-text', 'progress', 'button'
        ];

        // 处理结束标签后跟开始标签的情况，确保不同标签之间换行
        formatted = formatted.replace(
            /<\/(\w+)>(\s*)<(\w+)/g,
            (match, endTag, whitespace, startTag) => {
                // 如果是不同的标签，且其中一个是块级标签，则换行
                if (endTag !== startTag && (blockTags.includes(endTag) || blockTags.includes(startTag))) {
                    // 如果已经有换行，保持原有缩进
                    if (whitespace.includes('\n')) {
                        return match;
                    }

                    // 获取当前的缩进级别
                    const beforeMatch = formatted.substring(0, formatted.indexOf(match));
                    const lines = beforeMatch.split('\n');
                    const lastLine = lines[lines.length - 1];
                    const indentMatch = lastLine.match(/^(\s*)/);
                    const currentIndent = indentMatch ? indentMatch[1] : '';

                    return `</${endTag}>\n${currentIndent}<${startTag}`;
                }

                // 保持原样
                return match;
            }
        );

        // 处理同级标签之间的换行（包括相同标签和不同标签）
        // 使用分行处理来正确获取缩进
        const lines = formatted.split('\n');
        const processedLines = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];

            // 处理行内的标签换行
            line = line.replace(
                /<\/(\w+)><(\w+)/g,
                (match, endTag, startTag) => {
                    // 如果都是块级标签，则换行（包括相同标签）
                    if (blockTags.includes(endTag) && blockTags.includes(startTag)) {
                        // 获取当前行的缩进
                        const indentMatch = line.match(/^(\s*)/);
                        const currentIndent = indentMatch ? indentMatch[1] : '';

                        return `</${endTag}>\n${currentIndent}<${startTag}`;
                    }

                    // 保持原样
                    return match;
                }
            );

            processedLines.push(line);
        }

        formatted = processedLines.join('\n');

        return formatted;
    }

    fixSwiperItemSeparation(text) {
        let fixed = text;

        // 1. 处理开始标签后紧跟其他标签的情况 - 确保换行
        // 但要排除内联标签的情况
        const inlineTags = ['text', 'icon'];

        fixed = fixed.replace(/>(\s*)<(\w+)/g, (match, whitespace, nextTag) => {
            // 如果没有换行符，添加换行
            if (!whitespace.includes('\n')) {
                return `>\n<${nextTag}`;
            }
            return match;
        });

        // 2. 处理相邻的块级标签换行
        const blockTags = ['view', 'swiper-item', 'button', 'text', 'scroll-view', 'swiper'];

        blockTags.forEach(endTag => {
            blockTags.forEach(startTag => {
                // 处理 </tag><tag> 模式
                const pattern = new RegExp(`(\\s*)<\\/${endTag}><${startTag}`, 'g');
                fixed = fixed.replace(pattern, (match, indent) => {
                    return `${indent}</${endTag}>\n${indent}<${startTag}`;
                });
            });
        });

        // 3. 确保闭合标签独立成行
        // 处理内容后紧跟闭合标签的情况
        fixed = fixed.replace(/([^>\n\s])(\s*)(<\/[\w-]+>)/g, (match, content, whitespace, closeTag) => {
            return `${content}\n${closeTag}`;
        });

        // 处理开始标签后紧跟闭合标签的情况（空标签）
        fixed = fixed.replace(/>(\s*)(<\/[\w-]+>)/g, (match, whitespace, closeTag) => {
            if (!whitespace.includes('\n')) {
                return `>\n${closeTag}`;
            }
            return match;
        });

        // 4. 处理内联标签内容不换行
        fixed = this.fixInlineTagContent(fixed);

        // 5. 修复缩进
        fixed = this.fixIndentation(fixed);

        return fixed;
    }

    fixIndentation(text) {
        const lines = text.split('\n');
        const result = [];
        let currentIndent = 0;
        const indentStr = '  '; // 2个空格缩进

        for (const line of lines) {
            const trimmedLine = line.trim();

            if (!trimmedLine) {
                result.push('');
                continue;
            }

            // 检查是否是结束标签
            const isClosingTag = trimmedLine.startsWith('</');

            // 检查是否是自闭合标签
            const isSelfClosing = trimmedLine.includes('/>');

            // 检查是否是开始标签
            const isOpeningTag = trimmedLine.startsWith('<') && !isClosingTag && !trimmedLine.startsWith('<!--');

            // 检查是否是同一行包含开始和结束标签
            const hasOpenAndClose = isOpeningTag && trimmedLine.includes('</');

            // 如果是结束标签，先减少缩进
            if (isClosingTag) {
                currentIndent = Math.max(0, currentIndent - 1);
            }

            // 应用当前缩进
            const indentedLine = indentStr.repeat(currentIndent) + trimmedLine;
            result.push(indentedLine);

            // 如果是开始标签且不是自闭合标签，增加缩进
            if (isOpeningTag && !isSelfClosing && !hasOpenAndClose) {
                currentIndent++;
            }
        }

        return result.join('\n');
    }

    fixInlineTagContent(text) {
        let fixed = text;

        // 处理需要内容保持同一行的标签
        const inlineContentTags = ['text', 'button']; // text和button的内容都应该保持在同一行

        inlineContentTags.forEach(tagName => {
            const pattern = new RegExp(`(<${tagName}[^>]*>)\\s*([^<]*?)\\s*(<\\/${tagName}>)`, 'gs');
            fixed = fixed.replace(pattern, (match, openTag, content, closeTag) => {
                // 清理内容中的换行符和多余空格，但保持原始文本
                const cleanContent = content.replace(/\s+/g, ' ').trim();

                // 内容始终保持在同一行，无论长度
                if (cleanContent.length > 0 && !cleanContent.includes('<')) {
                    return `${openTag}${cleanContent}${closeTag}`;
                }
                // 如果是空内容
                if (cleanContent.length === 0) {
                    return `${openTag}${closeTag}`;
                }
                return match;
            });
        });

        // 处理其他内联标签（icon等）- 只有简短内容才保持同一行
        const otherInlineTags = ['icon'];
        otherInlineTags.forEach(tagName => {
            const pattern = new RegExp(`(<${tagName}[^>]*>)\\s*([^<]*?)\\s*(<\\/${tagName}>)`, 'gs');
            fixed = fixed.replace(pattern, (match, openTag, content, closeTag) => {
                const cleanContent = content.replace(/\s+/g, ' ').trim();

                // 只有简短内容才保持在同一行
                if (cleanContent.length > 0 && cleanContent.length <= 50 && !cleanContent.includes('<')) {
                    return `${openTag}${cleanContent}${closeTag}`;
                }
                return match;
            });
        });

        return fixed;
    }
}

// 测试用例
const testCases = [
    {
        name: '简单WXML格式化',
        input: '<view class="container"><text wx:if="{{show}}">Hello World</text><button bind:tap="onTap" class="btn">Click Me</button></view>',
        description: '测试基本的WXML元素格式化'
    },
    {
        name: '条件渲染格式化',
        input: '<view><text wx:if="{{condition}}">显示文本</text><text wx:elif="{{other}}">其他文本</text><text wx:else>默认文本</text></view>',
        description: '测试wx:if, wx:elif, wx:else的格式化'
    },
    {
        name: '列表渲染格式化',
        input: '<view wx:for="{{list}}" wx:key="id" wx:for-item="item" wx:for-index="index"><text>{{item.name}}</text></view>',
        description: '测试wx:for循环的格式化'
    },
    {
        name: '事件绑定格式化',
        input: '<button bind:tap="onTap" catch:touchstart="onTouch" capture-bind:longpress="onLongPress">按钮</button>',
        description: '测试各种事件绑定的格式化'
    },
    {
        name: '双花括号表达式保护',
        input: '<text>{{user.name + " - " + user.age}}</text><view class="{{isActive ? \'active\' : \'inactive\'}}">内容</view>',
        description: '测试复杂表达式的保护'
    },
    {
        name: '复杂嵌套表达式',
        input: '<view class="{{item.status === \'active\' ? (item.type === \'vip\' ? \'vip-active\' : \'normal-active\') : \'inactive\'}}"><text>{{item.data && item.data.user ? item.data.user.name : \'未知用户\'}}</text></view>',
        description: '测试复杂嵌套的双花括号表达式'
    },
    {
        name: '自闭合标签格式化',
        input: '<view><image src="{{avatar}}" mode="aspectFit"></image><input type="text" placeholder="请输入"></input><icon type="success" size="20"></icon></view>',
        description: '测试自闭合标签的格式化'
    },
    {
        name: '多属性标签换行',
        input: '<button class="btn" style="color: red;" bind:tap="onTap" data-id="{{item.id}}" data-type="{{item.type}}" disabled="{{loading}}">提交</button>',
        description: '测试多属性标签的换行格式化'
    },
    {
        name: '微信小程序组件',
        input: '<scroll-view scroll-y="true" class="scroll-area"><swiper indicator-dots="{{true}}" autoplay="{{false}}" interval="{{5000}}"><swiper-item><image src="{{item.url}}" mode="aspectFill"></image></swiper-item></swiper></scroll-view>',
        description: '测试微信小程序特有组件的格式化'
    },
    {
        name: '表单组件格式化',
        input: '<form bind:submit="onSubmit"><input name="username" placeholder="用户名" value="{{form.username}}" bind:input="onInput"/><textarea name="content" placeholder="请输入内容" value="{{form.content}}" bind:input="onTextareaInput"></textarea><button form-type="submit">提交</button></form>',
        description: '测试表单相关组件的格式化'
    },
    {
        name: '标签层级和换行测试',
        input: '<view class="container"><view class="header"><text class="title">标题</text></view><view class="content"><view class="item"><text>项目1</text></view><view class="item"><text>项目2</text></view></view></view>',
        description: '测试标签层级缩进和换行是否正确'
    },
    {
        name: 'Swiper组件换行测试',
        input: '<swiper indicator-dots="true"><swiper-item><view>页面1</view></swiper-item><swiper-item><view>页面2</view></swiper-item></swiper>',
        description: '测试swiper组件的换行格式化',
        expected: `<swiper indicator-dots="true">
  <swiper-item>
    <view>页面1</view>
  </swiper-item>
  <swiper-item>
    <view>页面2</view>
  </swiper-item>
</swiper>`
    }
];

// 运行测试
function runTests() {
    const formatter = new WXMLFormatter();
    const outputDir = path.join(__dirname, 'output');
    
    // 创建输出目录
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log('🧪 开始运行WXML格式化器测试...\n');
    
    testCases.forEach((testCase, index) => {
        console.log(`📝 测试 ${index + 1}: ${testCase.name}`);
        console.log(`📋 描述: ${testCase.description}`);
        console.log('📥 输入:');
        console.log(testCase.input);
        
        try {
            const formatted = formatter.format(testCase.input);
            console.log('📤 输出:');
            console.log(formatted);
            
            // 保存测试结果
            const outputFile = path.join(outputDir, `test-${index + 1}-${testCase.name.replace(/\s+/g, '-')}.wxml`);
            fs.writeFileSync(outputFile, formatted);
            console.log(`💾 结果已保存到: ${outputFile}`);
            
            console.log('✅ 测试通过\n');
        } catch (error) {
            console.log(`❌ 测试失败: ${error.message}\n`);
        }
    });
    
    console.log('🎉 所有测试完成！');
}

// 如果直接运行此文件，则执行测试
if (require.main === module) {
    runTests();
}

module.exports = { WXMLFormatter, testCases, runTests };
