import * as vscode from 'vscode';
import { WXMLFormatter } from './formatter';

export function activate(context: vscode.ExtensionContext) {
    console.log('WXML Formatter extension is now active!');

    // 注册格式化命令
    const formatCommand = vscode.commands.registerCommand('wxml-formatter.format', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        if (editor.document.languageId !== 'wxml') {
            vscode.window.showErrorMessage('This command only works with WXML files');
            return;
        }

        const formatter = new WXMLFormatter();
        const document = editor.document;
        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length)
        );

        try {
            const formattedText = formatter.format(document.getText());
            editor.edit(editBuilder => {
                editBuilder.replace(fullRange, formattedText);
            });
            vscode.window.showInformationMessage('WXML file formatted successfully!');
        } catch (error) {
            vscode.window.showErrorMessage(`Formatting failed: ${error}`);
        }
    });

    // 注册文档格式化提供程序
    const documentFormattingProvider = vscode.languages.registerDocumentFormattingEditProvider(
        { scheme: 'file', language: 'wxml' },
        {
            provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
                const formatter = new WXMLFormatter();
                const fullRange = new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(document.getText().length)
                );

                try {
                    const formattedText = formatter.format(document.getText());
                    return [vscode.TextEdit.replace(fullRange, formattedText)];
                } catch (error) {
                    vscode.window.showErrorMessage(`Formatting failed: ${error}`);
                    return [];
                }
            }
        }
    );

    // 注册范围格式化提供程序
    const rangeFormattingProvider = vscode.languages.registerDocumentRangeFormattingEditProvider(
        { scheme: 'file', language: 'wxml' },
        {
            provideDocumentRangeFormattingEdits(
                document: vscode.TextDocument,
                range: vscode.Range
            ): vscode.TextEdit[] {
                const formatter = new WXMLFormatter();
                const text = document.getText(range);

                try {
                    const formattedText = formatter.format(text);
                    return [vscode.TextEdit.replace(range, formattedText)];
                } catch (error) {
                    vscode.window.showErrorMessage(`Formatting failed: ${error}`);
                    return [];
                }
            }
        }
    );

    context.subscriptions.push(formatCommand);
    context.subscriptions.push(documentFormattingProvider);
    context.subscriptions.push(rangeFormattingProvider);
}

export function deactivate() {
    console.log('WXML Formatter extension is now deactivated!');
}
