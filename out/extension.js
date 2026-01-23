"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const formatter_1 = require("./formatter");
const WXML_SELECTOR = [{ scheme: 'file', pattern: '**/*.wxml' }];
/**
 * Creates a full document range
 */
function getFullDocumentRange(document) {
    return new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
}
/**
 * Formats text and handles errors
 */
function formatText(text, showSuccessMessage = false) {
    const formatter = new formatter_1.WXMLFormatter();
    try {
        const formattedText = formatter.format(text);
        if (showSuccessMessage) {
            vscode.window.showInformationMessage('WXML file formatted successfully!');
        }
        return formattedText;
    }
    catch (error) {
        vscode.window.showErrorMessage(`Formatting failed: ${error}`);
        return null;
    }
}
function activate(context) {
    console.log('WXML Formatter extension is now active!');
    // Register format command
    const formatCommand = vscode.commands.registerCommand('wxml-formatter.format', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }
        if (!editor.document.fileName.endsWith('.wxml')) {
            vscode.window.showErrorMessage('This command only works with .wxml files');
            return;
        }
        const document = editor.document;
        const fullRange = getFullDocumentRange(document);
        const formattedText = formatText(document.getText(), true);
        if (formattedText) {
            editor.edit(editBuilder => {
                editBuilder.replace(fullRange, formattedText);
            });
        }
    });
    // Register document formatting provider
    const documentFormattingProvider = vscode.languages.registerDocumentFormattingEditProvider(WXML_SELECTOR, {
        provideDocumentFormattingEdits(document) {
            // Double check: only format .wxml files
            if (!document.fileName.endsWith('.wxml')) {
                return [];
            }
            const fullRange = getFullDocumentRange(document);
            const formattedText = formatText(document.getText());
            return formattedText ? [vscode.TextEdit.replace(fullRange, formattedText)] : [];
        }
    });
    // Register range formatting provider
    const rangeFormattingProvider = vscode.languages.registerDocumentRangeFormattingEditProvider(WXML_SELECTOR, {
        provideDocumentRangeFormattingEdits(document, range) {
            // Double check: only format .wxml files
            if (!document.fileName.endsWith('.wxml')) {
                return [];
            }
            const text = document.getText(range);
            const formattedText = formatText(text);
            return formattedText ? [vscode.TextEdit.replace(range, formattedText)] : [];
        }
    });
    context.subscriptions.push(formatCommand, documentFormattingProvider, rangeFormattingProvider);
}
exports.activate = activate;
function deactivate() {
    console.log('WXML Formatter extension is now deactivated!');
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map