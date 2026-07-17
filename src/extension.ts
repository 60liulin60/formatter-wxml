import * as vscode from "vscode";
import { WXMLFormatter } from "./formatter";

/** 仅匹配磁盘上的 .wxml 文件 */
const WXML_SELECTOR: vscode.DocumentSelector = [
  { scheme: "file", pattern: "**/*.wxml" },
];

/** 扩展生命周期内复用同一实例，避免重复构造 */
const formatter = new WXMLFormatter();

/** 检查路径是否为 .wxml */
function isWxmlFile(fileName: string): boolean {
  return fileName.endsWith(".wxml");
}

/** 创建覆盖整篇文档的 Range */
function getFullDocumentRange(document: vscode.TextDocument): vscode.Range {
  return new vscode.Range(
    document.positionAt(0),
    document.positionAt(document.getText().length)
  );
}

/**
 * 格式化文本；失败时弹出简短错误并返回 null
 * @param text 待格式化源码
 * @param showSuccessMessage 是否在成功后提示（命令面板路径使用）
 */
function formatText(
  text: string,
  showSuccessMessage = false
): string | null {
  try {
    const formattedText = formatter.format(text);
    if (showSuccessMessage) {
      vscode.window.showInformationMessage("WXML file formatted successfully!");
    }
    return formattedText;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`WXML 格式化失败: ${message}`);
    return null;
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log("WXML Formatter extension is now active!");

  // 命令：Format WXML
  const formatCommand = vscode.commands.registerCommand(
    "wxml-formatter.format",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor found");
        return;
      }

      if (!isWxmlFile(editor.document.fileName)) {
        vscode.window.showErrorMessage(
          "This command only works with .wxml files"
        );
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
    }
  );

  // 文档级格式化（Shift+Alt+F）
  const documentFormattingProvider =
    vscode.languages.registerDocumentFormattingEditProvider(WXML_SELECTOR, {
      provideDocumentFormattingEdits(
        document: vscode.TextDocument
      ): vscode.TextEdit[] {
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
  const rangeFormattingProvider =
    vscode.languages.registerDocumentRangeFormattingEditProvider(
      WXML_SELECTOR,
      {
        provideDocumentRangeFormattingEdits(
          document: vscode.TextDocument,
          range: vscode.Range
        ): vscode.TextEdit[] {
          if (!isWxmlFile(document.fileName)) {
            return [];
          }
          const formattedText = formatText(document.getText(range));
          return formattedText
            ? [vscode.TextEdit.replace(range, formattedText)]
            : [];
        },
      }
    );

  context.subscriptions.push(
    formatCommand,
    documentFormattingProvider,
    rangeFormattingProvider
  );
}

export function deactivate() {
  console.log("WXML Formatter extension is now deactivated!");
}