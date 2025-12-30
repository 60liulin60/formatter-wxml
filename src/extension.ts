import * as vscode from 'vscode';
import { WXMLFormatter } from './formatter';

const WXML_SELECTOR = { scheme: 'file', language: 'wxml' };

/**
 * Creates a full document range
 */
function getFullDocumentRange(document: vscode.TextDocument): vscode.Range {
    return new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length)
    );
}

/**
 * Formats text and handles errors
 */
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

    // Register format command
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
    const documentFormattingProvider = vscode.languages.registerDocumentFormattingEditProvider(
        WXML_SELECTOR,
        {
            provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
                const fullRange = getFullDocumentRange(document);
                const formattedText = formatText(document.getText());
                return formattedText ? [vscode.TextEdit.replace(fullRange, formattedText)] : [];
            }
        }
    );

    // Register range formatting provider
    const rangeFormattingProvider = vscode.languages.registerDocumentRangeFormattingEditProvider(
        WXML_SELECTOR,
        {
            provideDocumentRangeFormattingEdits(
                document: vscode.TextDocument,
                range: vscode.Range
            ): vscode.TextEdit[] {
                const text = document.getText(range);
                const formattedText = formatText(text);
                return formattedText ? [vscode.TextEdit.replace(range, formattedText)] : [];
            }
        }
    );

    context.subscriptions.push(formatCommand, documentFormattingProvider, rangeFormattingProvider);
}

export function deactivate() {
    console.log('WXML Formatter extension is now deactivated!');
}
