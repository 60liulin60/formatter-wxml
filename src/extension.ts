import * as vscode from 'vscode';
import { WXMLFormatter } from './formatter';

const WXML_SELECTOR: vscode.DocumentSelector = [{ scheme: 'file', pattern: '**/*.wxml' }];

/** 检查是否为 .wxml 文件 */
function isWxmlFile(fileName: string): boolean {
    return fileName.endsWith('.wxml');
}

/** 创建完整文档范围 */
function getFullDocumentRange(document: vscode.TextDocument): vscode.Range {
    return new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length)
    );
}

/** 格式化文本并处理错误 */
function formatText(text: string, showSuccessMessage = false): string | null {
    const formatter = new WXMLFormatter();
    try {
        const formattedText = formatter.format(text);
        if (showSuccessMessage) {
            vscode.window.showInformationMessage('WXML file formatted successfully!');
        }
        return formattedText;
    } catch (error) {
        vscode.window.showErrorMessage(`Formatting failed: ${error}`);
        return null;
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('WXML Formatter extension is now active!');

    // 注册格式化命令
    const formatCommand = vscode.commands.registerCommand('wxml-formatter.format', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        if (!isWxmlFile(editor.document.fileName)) {
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

    // 注册文档格式化提供者
    const documentFormattingProvider = vscode.languages.registerDocumentFormattingEditProvider(
        WXML_SELECTOR,
        {
            provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
                if (!isWxmlFile(document.fileName)) return [];
                const fullRange = getFullDocumentRange(document);
                const formattedText = formatText(document.getText());
                return formattedText ? [vscode.TextEdit.replace(fullRange, formattedText)] : [];
            }
        }
    );

    // 注册范围格式化提供者
    const rangeFormattingProvider = vscode.languages.registerDocumentRangeFormattingEditProvider(
        WXML_SELECTOR,
        {
            provideDocumentRangeFormattingEdits(
                document: vscode.TextDocument,
                range: vscode.Range
            ): vscode.TextEdit[] {
                if (!isWxmlFile(document.fileName)) return [];
                const formattedText = formatText(document.getText(range));
                return formattedText ? [vscode.TextEdit.replace(range, formattedText)] : [];
            }
        }
    );

    context.subscriptions.push(formatCommand, documentFormattingProvider, rangeFormattingProvider);
}

export function deactivate() {
    console.log('WXML Formatter extension is now deactivated!');
}
