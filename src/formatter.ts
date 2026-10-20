import * as vscode from "vscode";
import {
  FormatterConfig,
  createDefaultConfig,
  formatWxml,
} from "./format-core";

/**
 * VS Code 侧格式化器：缓存配置读取，委托纯核心 formatWxml
 */
export class WXMLFormatter {
  /** 缓存的生效配置，配置变更时失效 */
  private cachedConfig: FormatterConfig | null = null;
  /** 是否已挂载配置变更监听（只挂一次） */
  private listeningConfig = false;

  /**
   * 格式化完整 WXML 文本
   * @param text 编辑器或选区中的原文
   */
  public format(text: string): string {
    return formatWxml(text, this.getConfiguration());
  }

  /**
   * 读取当前生效配置；结果缓存，避免每次格式化都打 VS Code 配置 API
   * package.json 仍保留部分未生效项声明，见 README/CHANGELOG
   */
  private getConfiguration(): FormatterConfig {
    this.ensureConfigListener();
    if (this.cachedConfig) {
      return this.cachedConfig;
    }

    const config = vscode.workspace.getConfiguration("wxml-formatter");
    const defaults = createDefaultConfig();
    this.cachedConfig = {
      indentSize: config.get<number>("indentSize", defaults.indentSize),
      wrapAttributes: config.get<number>(
        "wrapAttributes",
        defaults.wrapAttributes
      ),
      selfClosingTags: config.get<string[]>(
        "selfClosingTags",
        defaults.selfClosingTags
      ),
      inlineTags: config.get<string[]>("inlineTags", defaults.inlineTags),
    };
    return this.cachedConfig;
  }

  /** 监听 wxml-formatter.* 变更，使缓存失效 */
  private ensureConfigListener(): void {
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

// 便于外部直接复用核心 API
export { formatWxml, createDefaultConfig } from "./format-core";
export type { FormatterConfig } from "./format-core";