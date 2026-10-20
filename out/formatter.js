"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultConfig = exports.formatWxml = exports.WXMLFormatter = void 0;
const vscode = require("vscode");
const format_core_1 = require("./format-core");
/**
 * VS Code 侧格式化器：缓存配置读取，委托纯核心 formatWxml
 */
class WXMLFormatter {
    constructor() {
        /** 缓存的生效配置，配置变更时失效 */
        this.cachedConfig = null;
        /** 是否已挂载配置变更监听（只挂一次） */
        this.listeningConfig = false;
    }
    /**
     * 格式化完整 WXML 文本
     * @param text 编辑器或选区中的原文
     */
    format(text) {
        return (0, format_core_1.formatWxml)(text, this.getConfiguration());
    }
    /**
     * 读取当前生效配置；结果缓存，避免每次格式化都打 VS Code 配置 API
     * package.json 仍保留部分未生效项声明，见 README/CHANGELOG
     */
    getConfiguration() {
        this.ensureConfigListener();
        if (this.cachedConfig) {
            return this.cachedConfig;
        }
        const config = vscode.workspace.getConfiguration("wxml-formatter");
        const defaults = (0, format_core_1.createDefaultConfig)();
        this.cachedConfig = {
            indentSize: config.get("indentSize", defaults.indentSize),
            wrapAttributes: config.get("wrapAttributes", defaults.wrapAttributes),
            selfClosingTags: config.get("selfClosingTags", defaults.selfClosingTags),
            inlineTags: config.get("inlineTags", defaults.inlineTags),
        };
        return this.cachedConfig;
    }
    /** 监听 wxml-formatter.* 变更，使缓存失效 */
    ensureConfigListener() {
        if (this.listeningConfig) {
            return;
        }
        this.listeningConfig = true;
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration("wxml-formatter")) {
                this.cachedConfig = null;
            }
        });
    }
}
exports.WXMLFormatter = WXMLFormatter;
// 便于外部直接复用核心 API
var format_core_2 = require("./format-core");
Object.defineProperty(exports, "formatWxml", { enumerable: true, get: function () { return format_core_2.formatWxml; } });
Object.defineProperty(exports, "createDefaultConfig", { enumerable: true, get: function () { return format_core_2.createDefaultConfig; } });
//# sourceMappingURL=formatter.js.map