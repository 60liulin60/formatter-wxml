/**
 * 纯 WXML 格式化核心：不依赖 vscode，可供扩展与 Node 测试共用
 * 性能要点：单次词法扫描、token 级自闭合合并、indent/Set 缓存
 */
import {
  FormatterConfig,
  SHORT_TEXT_INLINE_LIMIT,
  TAG_LENGTH_WRAP_THRESHOLD,
  createDefaultConfig,
} from "./defaults";

export type { FormatterConfig } from "./defaults";
export {
  DEFAULT_INLINE_TAGS,
  DEFAULT_SELF_CLOSING_TAGS,
  SHORT_TEXT_INLINE_LIMIT,
  TAG_LENGTH_WRAP_THRESHOLD,
  createDefaultConfig,
} from "./defaults";

/** 解析后的单个属性（布尔属性 value 为空串） */
interface ParsedAttribute {
  name: string;
  value: string;
}

/** 词法单元 */
interface Token {
  type: "open" | "close" | "selfClose" | "text" | "comment";
  content: string;
  tagName?: string;
  attributes?: ParsedAttribute[];
  /** 开始标签的原始长度，用于超长换行判定 */
  tagLength?: number;
}

/** 提取标签名 */
const TAG_NAME_RE = /<\/?([\w-]+)/;
/** 解析属性 */
const ATTR_RE = /([\w-:]+)(?:=("[^"]*"|'[^']*'))?/g;
/** 标签名与属性粘连修复 */
const STUCK_ATTR_RE = /<([\w-]+)([a-zA-Z][^=\s>]*=)/g;
/** 指令等号旁空格规范化 */
const DIR_EQ_RE =
  /(wx:|bind:|catch:|capture-bind:|capture-catch:)(\w+)(\s*=\s*)(['"])/g;

/**
 * 格式化 WXML 文本
 * @param text 原始 WXML
 * @param config 可选配置，缺省使用默认值
 */
export function formatWxml(text: string, config?: FormatterConfig): string {
  // 空串直接返回，避免后续全链路开销
  if (!text) {
    return text;
  }

  const resolved = config ?? createDefaultConfig();

  try {
    // 分词时直接保留原始标签长度，避免占位与二次全文扫描
    const scannedTokens = tokenize(text);
    const selfClosingTagSet = toTagSet(resolved.selfClosingTags);
    const tokens = normalizeSelfClosingTokens(
      scannedTokens,
      selfClosingTagSet
    );

    // 构建阶段用 Set / 缩进缓存，降低重复查找与字符串拼接成本
    const runtime: BuildRuntime = {
      indentUnit: " ".repeat(resolved.indentSize),
      indentCache: [""],
      wrapAttributes: resolved.wrapAttributes,
      inlineTagSet: toTagSet(resolved.inlineTags),
      packAttributes: resolved.packAttributes === true,
      attributesPerLine: resolved.attributesPerLine,
      attributeLineWidth: resolved.attributeLineWidth,
    };
    let result = buildDocument(tokens, runtime);
    result = finalCleanup(result);
    return result;
  } catch (error) {
    throw new Error(`Failed to format WXML: ${error}`);
  }
}

/** 构建文档时的只读运行时上下文 */
interface BuildRuntime {
  indentUnit: string;
  indentCache: string[];
  wrapAttributes: number;
  inlineTagSet: Set<string>;
  /** 是否开启一行多个属性 */
  packAttributes: boolean;
  /** 每行最多属性个数，<= 0 表示不限制 */
  attributesPerLine: number;
  /** 属性行最大宽度，<= 0 表示不限制 */
  attributeLineWidth: number;
}

/** 标签列表转 Set，便于 O(1) 判定 */
function toTagSet(tags: string[]): Set<string> {
  return new Set(tags);
}

/** 从标签片段提取标签名 */
function extractTagName(content: string): string {
  return content.match(TAG_NAME_RE)?.[1] || "";
}

/** 判断字符是否可作为 WXML 标签名的首字符 */
function isTagNameChar(charCode: number): boolean {
  return (
    charCode === 45 ||
    (charCode >= 48 && charCode <= 57) ||
    (charCode >= 65 && charCode <= 90) ||
    charCode === 95 ||
    (charCode >= 97 && charCode <= 122)
  );
}

/**
 * 判断当前小于号是否为标签起点
 * 边界：普通文本中的孤立小于号仍按文本处理。
 */
function isTagStart(text: string, start: number): boolean {
  const nextCode = text.charCodeAt(start + 1);
  if (nextCode === 47) {
    return isTagNameChar(text.charCodeAt(start + 2));
  }
  return isTagNameChar(nextCode);
}

/**
 * 查找标签结束位置
 * 关键边界：引号内的大于号属于属性值，不得提前结束标签。
 */
function findTagEnd(text: string, start: number): number {
  let quoteCode = 0;
  for (let i = start + 1; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    if (quoteCode !== 0) {
      if (charCode === 92) {
        // 跳过引号内的转义字符，避免误判后续引号
        i += 1;
      } else if (charCode === quoteCode) {
        quoteCode = 0;
      }
      continue;
    }

    if (charCode === 34 || charCode === 39) {
      quoteCode = charCode;
    } else if (charCode === 62) {
      return i;
    }
  }
  return -1;
}

/** 按历史规则折叠 token 内空白，并清理标签结尾空格 */
function normalizeTokenContent(raw: string): string {
  const collapsed = raw.replace(/\s+/g, " ").trim();
  return collapsed.startsWith("<")
    ? collapsed.replace(/\/\s*>$/, "/>").replace(/\s+>$/, ">")
    : collapsed;
}

/** 将已识别的标签片段转为结构化 token */
function pushTagToken(tokens: Token[], raw: string): void {
  const content = normalizeTokenContent(raw);
  const tagName = extractTagName(content);
  if (!tagName) {
    tokens.push({ type: "text", content });
    return;
  }

  if (content.startsWith("</")) {
    tokens.push({ type: "close", content, tagName });
    return;
  }

  if (content.endsWith("/>")) {
    tokens.push({
      type: "selfClose",
      content,
      tagName,
      attributes: parseAttributes(content.slice(tagName.length + 1, -2)),
      tagLength: raw.length,
    });
    return;
  }

  tokens.push({
    type: "open",
    content,
    tagName,
    attributes: parseAttributes(content.slice(tagName.length + 1, -1)),
    tagLength: raw.length,
  });
}

/**
 * 单次顺序扫描 WXML，识别注释、标签与文本
 * 注释整体消费，其中的伪标签不会污染后续长度判定。
 */
function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    if (text.startsWith("<!--", cursor)) {
      const commentEnd = text.indexOf("-->", cursor + 4);
      if (commentEnd >= 0) {
        const content = normalizeTokenContent(
          text.slice(cursor, commentEnd + 3)
        );
        if (content) {
          tokens.push({ type: "comment", content });
        }
        cursor = commentEnd + 3;
        continue;
      }
    }

    if (text.charCodeAt(cursor) === 60 && isTagStart(text, cursor)) {
      const tagEnd = findTagEnd(text, cursor);
      if (tagEnd >= 0) {
        pushTagToken(tokens, text.slice(cursor, tagEnd + 1));
        cursor = tagEnd + 1;
        continue;
      }
    }

    if (text.charCodeAt(cursor) === 60) {
      tokens.push({ type: "text", content: "<" });
      cursor += 1;
      continue;
    }

    const nextTagStart = text.indexOf("<", cursor);
    const textEnd = nextTagStart >= 0 ? nextTagStart : text.length;
    const content = normalizeTokenContent(text.slice(cursor, textEnd));
    if (content) {
      tokens.push({ type: "text", content });
    }
    cursor = textEnd;
  }

  return tokens;
}

/** 将开始标签内容转为标准自闭合形式 */
function toSelfClosingContent(content: string): string {
  return `${content.slice(0, -1).trimEnd()} />`;
}

/**
 * 仅合并配置名单中相邻且无内容的成对标签
 * token 级判定避免自定义标签前缀误匹配。
 */
function normalizeSelfClosingTokens(
  tokens: Token[],
  selfClosingTagSet: Set<string>
): Token[] {
  if (selfClosingTagSet.size === 0) {
    return tokens;
  }

  const normalized: Token[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const nextToken = tokens[i + 1];
    if (
      token.type === "open" &&
      nextToken?.type === "close" &&
      token.tagName === nextToken.tagName &&
      selfClosingTagSet.has(token.tagName || "")
    ) {
      normalized.push({
        ...token,
        type: "selfClose",
        content: toSelfClosingContent(token.content),
      });
      i += 1;
      continue;
    }
    normalized.push(token);
  }
  return normalized;
}

/** 按深度取缩进字符串，线性缓存避免重复 repeat */
function indentAt(runtime: BuildRuntime, depth: number): string {
  const cache = runtime.indentCache;
  while (cache.length <= depth) {
    cache.push(cache[cache.length - 1] + runtime.indentUnit);
  }
  return cache[depth]!;
}

/**
 * 将属性文本按「每行属性数 + 行宽」贪心分组
 *
 * 首行需要预留 `<标签名 ` 前缀，续行只含缩进；
 * 单个属性本身超宽时独占一行，不拆分属性。
 */
function packAttributeRows(
  attrTexts: string[],
  baseIndent: string,
  tagName: string,
  attrIndent: string,
  perLine: number,
  widthLimit: number
): string[][] {
  // 首行宽度基数：缩进 + "<" + 标签名 + 空格
  const firstRowBase = baseIndent.length + tagName.length + 2;
  const nextRowBase = attrIndent.length;
  const rows: string[][] = [];
  let current: string[] = [];
  let currentWidth = firstRowBase;

  for (let i = 0; i < attrTexts.length; i++) {
    const text = attrTexts[i]!;
    const separator = current.length > 0 ? 1 : 0;
    const countFull = perLine > 0 && current.length >= perLine;
    const widthFull =
      widthLimit > 0 && currentWidth + separator + text.length > widthLimit;
    if (current.length > 0 && (countFull || widthFull)) {
      rows.push(current);
      current = [];
      currentWidth = nextRowBase;
    }
    current.push(text);
    currentWidth += (current.length > 1 ? 1 : 0) + text.length;
  }

  if (current.length > 0) {
    rows.push(current);
  }
  return rows;
}

/** 将 token 序列重建为带缩进的文档 */
function buildDocument(tokens: Token[], runtime: BuildRuntime): string {
  const lines: string[] = [];
  let depth = 0;
  const wrapAt = runtime.wrapAttributes;
  const inlineSet = runtime.inlineTagSet;

  const formatAttr = (attr: ParsedAttribute): string =>
    attr.value ? `${attr.name}=${attr.value}` : attr.name;

  /**
   * 计算当前标签的属性行分组
   * 关闭一行多个：每个属性独占一行；开启：按数量 / 宽度贪心分组
   */
  const buildAttributeRows = (token: Token): string[][] => {
    const attrs = token.attributes || [];
    const attrTexts = attrs.map(formatAttr);
    if (!runtime.packAttributes) {
      return attrTexts.map((text) => [text]);
    }
    return packAttributeRows(
      attrTexts,
      indentAt(runtime, depth),
      token.tagName || "",
      indentAt(runtime, depth + 1),
      runtime.attributesPerLine,
      runtime.attributeLineWidth
    );
  };

  /** 属性数达标或原始开始标签超长则换行；开启一行多个后由分组结果决定 */
  const shouldWrapAttributes = (token: Token): boolean => {
    const attrs = token.attributes;
    if (!attrs || attrs.length === 0) {
      return false;
    }
    if (runtime.packAttributes) {
      // 只有一行装不下（数量或宽度超限）才换行
      return buildAttributeRows(token).length > 1;
    }
    if (attrs.length >= wrapAt) {
      return true;
    }
    return (
      token.tagLength !== undefined &&
      token.tagLength > TAG_LENGTH_WRAP_THRESHOLD
    );
  };

  /** 是否为 <tag>text</tag> 三明治结构 */
  const isInlineSandwich = (
    token: Token,
    next: Token | undefined,
    nextNext: Token | undefined
  ): boolean =>
    next?.type === "text" &&
    nextNext?.type === "close" &&
    nextNext.tagName === token.tagName;

  /**
   * 输出多属性开始标签；若可内联则吃掉 text+close
   * @returns 消费的额外 token 数（0 或 2）
   */
  const pushWrappedOpenTag = (
    token: Token,
    nextToken: Token | undefined,
    nextNextToken: Token | undefined,
    forceTextInlineStyle: boolean
  ): number => {
    const tagName = token.tagName || "";
    const isInlineTag = inlineSet.has(tagName);
    const shouldInline =
      isInlineSandwich(token, nextToken, nextNextToken) &&
      (forceTextInlineStyle || isInlineTag);
    const baseIndent = indentAt(runtime, depth);
    const attrIndent = indentAt(runtime, depth + 1);
    const rows = buildAttributeRows(token);

    // 开启一行多个：首行与标签名同行；关闭：标签名独占一行（保持原输出）
    lines.push(
      runtime.packAttributes
        ? `${baseIndent}<${tagName} ${rows[0]!.join(" ")}`
        : `${baseIndent}<${tagName}`
    );
    const firstRowIndex = runtime.packAttributes ? 1 : 0;
    for (let r = firstRowIndex; r < rows.length; r++) {
      lines.push(attrIndent + rows[r]!.join(" "));
    }

    // text 特殊：>内容</text> 挂在标签深度行（与末属性分行）
    if (forceTextInlineStyle && shouldInline) {
      lines.push(
        `${baseIndent}>${nextToken!.content}${nextNextToken!.content}`
      );
      return 2;
    }

    // 其它内联标签：末属性行收口
    if (shouldInline) {
      lines[lines.length - 1] += `>${nextToken!.content}${
        nextNextToken!.content
      }`;
      return 2;
    }

    lines.push(`${baseIndent}>`);
    depth += 1;
    return 0;
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const nextToken = tokens[i + 1];
    const nextNextToken = tokens[i + 2];

    if (token.type === "close") {
      depth = depth > 0 ? depth - 1 : 0;
      lines.push(indentAt(runtime, depth) + token.content);
      continue;
    }

    // text 多属性/超长：内容与 </text> 始终同行
    if (
      token.type === "open" &&
      token.tagName === "text" &&
      shouldWrapAttributes(token) &&
      isInlineSandwich(token, nextToken, nextNextToken)
    ) {
      i += pushWrappedOpenTag(token, nextToken, nextNextToken, true);
      continue;
    }

    // 多属性开始标签
    if (token.type === "open" && shouldWrapAttributes(token)) {
      i += pushWrappedOpenTag(token, nextToken, nextNextToken, false);
      continue;
    }

    // 内联标签或短文本整段单行
    if (
      token.type === "open" &&
      isInlineSandwich(token, nextToken, nextNextToken) &&
      (inlineSet.has(token.tagName || "") ||
        nextToken!.content.length <= SHORT_TEXT_INLINE_LIMIT)
    ) {
      lines.push(
        indentAt(runtime, depth) +
          token.content +
          nextToken!.content +
          nextNextToken!.content
      );
      i += 2;
      continue;
    }

    // 多属性自闭合
    if (token.type === "selfClose" && shouldWrapAttributes(token)) {
      const baseIndent = indentAt(runtime, depth);
      const attrIndent = indentAt(runtime, depth + 1);
      const rows = buildAttributeRows(token);
      lines.push(
        runtime.packAttributes
          ? `${baseIndent}<${token.tagName} ${rows[0]!.join(" ")}`
          : `${baseIndent}<${token.tagName}`
      );
      const firstRowIndex = runtime.packAttributes ? 1 : 0;
      for (let r = firstRowIndex; r < rows.length; r++) {
        lines.push(attrIndent + rows[r]!.join(" "));
      }
      lines[lines.length - 1] += " />";
      continue;
    }

    lines.push(indentAt(runtime, depth) + token.content);
    if (token.type === "open") {
      depth += 1;
    }
  }

  return lines.join("\n") + "\n";
}

/** 解析属性串：支持占位属性名、引号值、布尔属性 */
function parseAttributes(attrString: string): ParsedAttribute[] {
  if (!attrString) {
    return [];
  }
  const cleaned = attrString.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return [];
  }

  const attrs: ParsedAttribute[] = [];
  ATTR_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ATTR_RE.exec(cleaned)) !== null) {
    attrs.push({
      name: match[1]!,
      value: match[2] || "",
    });
  }
  return attrs;
}

/** 收尾修复：标签名与属性粘连、指令等号旁空格 */
function finalCleanup(text: string): string {
  // 两段静态正则；WXML 体量下开销可忽略且需兜底边界
  let result = text.replace(STUCK_ATTR_RE, "<$1 $2");
  result = result.replace(DIR_EQ_RE, "$1$2=$4");
  return result;
}

/**
 * 去掉格式化结果尾部的换行
 *
 * formatWxml 恒定以单个换行结尾，整篇替换时这是正确收口；
 * 但替换非整篇范围时该换行会落到范围之外，多出一个空行。
 */
export function trimTrailingNewlines(text: string): string {
  return text.replace(/[\r\n]+$/, "");
}

/**
 * 为每个非空行补上基准缩进
 *
 * 选区格式化时选区被当作独立文档从深度 0 重建，
 * 需要补回选区首行原有的缩进，才能保持其在父结构中的层级。
 * @param text 已格式化的文本，每行均从列 0 开始
 * @param baseIndent 选区首行的原始前导缩进
 */
export function applyBaseIndent(text: string, baseIndent: string): string {
  if (!baseIndent) {
    return text;
  }
  return text
    .split("\n")
    .map((line) => (line.length > 0 ? baseIndent + line : line))
    .join("\n");
}
