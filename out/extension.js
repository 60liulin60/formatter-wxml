"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const formatter_1 = require("./formatter");
/** 仅匹配磁盘上的 .wxml 文件 */
const WXML_SELECTOR = [
    { scheme: "file", pattern: "**/*.wxml" },
];
/** 扩展生命周期内复用同一实例，避免重复构造 */
const formatter = new formatter_1.WXMLFormatter();
/** 检查路径是否为 .wxml */
function isWxmlFile(fileName) {
    return fileName.endsWith(".wxml");
}
/** 创建覆盖整篇文档的 Range */
function getFullDocumentRange(document) {
    return new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
}
/**
 * 格式化文本；失败时弹出简短错误并返回 null
 * @param text 待格式化源码
 * @param showSuccessMessage 是否在成功后提示（命令面板路径使用）
 */
function formatText(text, showSuccessMessage = false) {
    try {
        const formattedText = formatter.format(text);
        if (showSuccessMessage) {
            vscode.window.showInformationMessage("WXML file formatted successfully!");
        }
        return formattedText;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`WXML 格式化失败: ${message}`);
        return null;
    }
}
function activate(context) {
    console.log("WXML Formatter extension is now active!");
    // 命令：Format WXML
    const formatCommand = vscode.commands.registerCommand("wxml-formatter.format", () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No active editor found");
            return;
        }
        if (!isWxmlFile(editor.document.fileName)) {
            vscode.window.showErrorMessage("This command only works with .wxml files");
            return;
        }
        const document = editor.document;
        const fullRange = getFullDocumentRange(document);
        const formattedText = formatText(document.getText(), true);
        if (formattedText) {
            editor.edit((editBuilder) => {
                editBuilder.replace(fullRange, formattedText);
            });
        }
    });
    // 文档级格式化（Shift+Alt+F）
    const documentFormattingProvider = vscode.languages.registerDocumentFormattingEditProvider(WXML_SELECTOR, {
        provideDocumentFormattingEdits(document) {
            if (!isWxmlFile(document.fileName)) {
                return [];
            }
            const fullRange = getFullDocumentRange(document);
            const formattedText = formatText(document.getText());
            return formattedText
                ? [vscode.TextEdit.replace(fullRange, formattedText)]
                : [];
        },
    });
    // 选区格式化
    const rangeFormattingProvider = vscode.languages.registerDocumentRangeFormattingEditProvider(WXML_SELECTOR, {
        provideDocumentRangeFormattingEdits(document, range) {
            if (!isWxmlFile(document.fileName)) {
                return [];
            }
            const formattedText = formatText(document.getText(range));
            return formattedText
                ? [vscode.TextEdit.replace(range, formattedText)]
                : [];
        },
    });
    context.subscriptions.push(formatCommand, documentFormattingProvider, rangeFormattingProvider);
}
exports.activate = activate;
function deactivate() {
    console.log("WXML Formatter extension is now deactivated!");
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map