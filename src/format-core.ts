/**
 * 纯 WXML 格式化核心：不依赖 vscode，可供扩展与 Node 测试共用
 * 性能要点：静态正则、自闭合一次合并扫描、indent/Set 缓存、无占位时跳过还原
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
  /** 保护语法前的开始标签原始长度，用于超长换行判定 */
  tagLength?: number;
}

/** 表达式/指令占位前缀，避免格式化时被拆开 */
const EXPR_PLACEHOLDER = "__WXML_EXPR_";
const DIR_PLACEHOLDER = "__WXML_DIR_";

// ---------- 模块级静态正则（避免每次 format 重新编译） ----------
/** 记录开始标签原始长度 */
const OPEN_TAG_LEN_RE = /<(?!\/)([\w-]+)[^>]*>/g;
/** 保护双花括号（支持一层嵌套大括号） */
const EXPR_PROTECT_RE = /\{\{[^}]*(?:\{[^}]*\}[^}]*)*\}\}/g;
/** 保护指令名 */
const DIR_PROTECT_RE =
  /(wx:|bind:|catch:|capture-bind:|capture-catch:)[\w-]+/g;
/** 还原指令占位 */
const DIR_RESTORE_RE = /__WXML_DIR_(\d+)__/g;
/** 还原表达式占位 */
const EXPR_RESTORE_RE = /__WXML_EXPR_(\d+)__/g;
/** 分词 */
const TOKEN_RE =
  /<!--[\s\S]*?-->|<\/[\w-]+\s*>|<[\w-]+[^>]*\/\s*>|<[\w-]+[^>]*\s*>|[^<]+|</g;
/** 提取标签名 */
const TAG_NAME_RE = /<\/?([\w-]+)/;
/** 解析属性 */
const ATTR_RE = /([\w-:]+|__WXML_\w+_\d+__)(?:=("[^"]*"|'[^']*'))?/g;
/** 标签名与属性粘连修复 */
const STUCK_ATTR_RE = /<([\w-]+)([a-zA-Z][^=\s>]*=)/g;
/** 指令等号旁空格规范化 */
const DIR_EQ_RE =
  /(wx:|bind:|catch:|capture-bind:|capture-catch:)(\w+)(\s*=\s*)(['"])/g;
/** 快速探测是否可能含指令 */
const DIR_HINT_RE = /(?:wx:|bind:|catch:|capture-)/;

/** 自闭合规范化正则缓存：key = 标签列表 join */
const normalizeRegexCache = new Map<
  string,
  { pair: RegExp; self: RegExp }
>();

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
  const ctx: FormatContext = {
    expressions: [],
    directives: [],
  };

  try {
    // 保护前按出现顺序记录开始标签长度，避免占位替换后长度失真
    const tagLengths = recordOpenTagLengths(text);

    let result = protectSpecialSyntax(text, ctx);
    result = normalizeSelfClosingTags(result, resolved.selfClosingTags);
    const tokens = tokenize(result);
    attachTagLengthsByOrder(tokens, tagLengths);

    // 构建阶段用 Set / 缩进缓存，降低重复查找与字符串拼接成本
    const runtime: BuildRuntime = {
      indentUnit: " ".repeat(resolved.indentSize),
      indentCache: [""],
      wrapAttributes: resolved.wrapAttributes,
      inlineTagSet: toTagSet(resolved.inlineTags),
    };
    result = buildDocument(tokens, runtime);
    result = restoreSpecialSyntax(result, ctx);
    result = finalCleanup(result);
    return result;
  } catch (error) {
    throw new Error(`Failed to format WXML: ${error}`);
  }
}

/** 格式化过程中的可变状态（表达式/指令还原表） */
interface FormatContext {
  expressions: string[];
  directives: string[];
}

/** 构建文档时的只读运行时上下文 */
interface BuildRuntime {
  indentUnit: string;
  indentCache: string[];
  wrapAttributes: number;
  inlineTagSet: Set<string>;
}

/** 转义正则特殊字符，保证自定义标签名安全拼进正则 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 标签列表转 Set，便于 O(1) 判定 */
function toTagSet(tags: string[]): Set<string> {
  return new Set(tags);
}

/**
 * 获取（并缓存）自闭合规范化用的合并正则
 * 将 N 个标签的 2N 次全串扫描降为固定 2 次
 */
function getNormalizeRegexes(tags: string[]): { pair: RegExp; self: RegExp } {
  const key = tags.join("\0");
  let cached = normalizeRegexCache.get(key);
  if (!cached) {
    const alt = tags.map(escapeRegExp).join("|");
    cached = {
      pair: new RegExp(
        `<(${alt})(?=[\\s/>])(\\s[^>]*?)?></\\1>`,
        "g"
      ),
      self: new RegExp(`<(${alt})(?=\\s)(\\s[^>]*)\\s*/>`, "g"),
    };
    normalizeRegexCache.set(key, cached);
  }
  // 全局正则复用前重置 lastIndex，避免脏状态
  cached.pair.lastIndex = 0;
  cached.self.lastIndex = 0;
  return cached;
}

/**
 * 按文档顺序记录每个开始/自闭合标签的原始字符长度
 * 边界：注释内的伪标签也会被计入，与历史行为一致
 */
function recordOpenTagLengths(text: string): number[] {
  const lengths: number[] = [];
  OPEN_TAG_LEN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = OPEN_TAG_LEN_RE.exec(text)) !== null) {
    lengths.push(match[0].length);
  }
  return lengths;
}

/**
 * 将原始长度按顺序挂到 open/selfClose token 上
 * 顺序对齐：normalize 成对标签为自闭合后，仍对应一条开始标签记录
 */
function attachTagLengthsByOrder(tokens: Token[], lengths: number[]): void {
  let index = 0;
  const total = lengths.length;
  for (let i = 0; i < tokens.length && index < total; i++) {
    const token = tokens[i]!;
    if (token.type === "open" || token.type === "selfClose") {
      token.tagLength = lengths[index];
      index += 1;
    }
  }
}

/** 保护 {{}} 表达式与 wx:/bind: 等指令名（无命中特征时跳过） */
function protectSpecialSyntax(text: string, ctx: FormatContext): string {
  let result = text;

  // 无双花括号则跳过表达式扫描
  if (result.includes("{{")) {
    EXPR_PROTECT_RE.lastIndex = 0;
    result = result.replace(EXPR_PROTECT_RE, (match) => {
      const index = ctx.expressions.length;
      ctx.expressions.push(match);
      return `${EXPR_PLACEHOLDER}${index}__`;
    });
  }

  // 无指令前缀则跳过指令扫描
  if (DIR_HINT_RE.test(result)) {
    DIR_PROTECT_RE.lastIndex = 0;
    result = result.replace(DIR_PROTECT_RE, (match) => {
      const index = ctx.directives.length;
      ctx.directives.push(match);
      return `${DIR_PLACEHOLDER}${index}__`;
    });
  }

  return result;
}

/** 按占位索引还原指令与表达式；无占位时直接返回 */
function restoreSpecialSyntax(text: string, ctx: FormatContext): string {
  let result = text;

  if (ctx.directives.length > 0) {
    DIR_RESTORE_RE.lastIndex = 0;
    result = result.replace(DIR_RESTORE_RE, (full, index: string) => {
      return ctx.directives[parseInt(index, 10)] || full;
    });
  }

  if (ctx.expressions.length > 0) {
    EXPR_RESTORE_RE.lastIndex = 0;
    result = result.replace(EXPR_RESTORE_RE, (full, index: string) => {
      return ctx.expressions[parseInt(index, 10)] || full;
    });
  }

  return result;
}

/**
 * 将配置中的成对标签规范为自闭合形式
 * 边界：用 (?=[\\s/>]) 避免 image 误匹配 image-foo；合并为两次全串扫描
 */
function normalizeSelfClosingTags(
  text: string,
  selfClosingTags: string[]
): string {
  if (selfClosingTags.length === 0) {
    return text;
  }

  // 快速路径：正文中完全不出现任一自闭合标签前缀
  let mayContain = false;
  for (let i = 0; i < selfClosingTags.length; i++) {
    if (text.includes(`<${selfClosingTags[i]}`)) {
      mayContain = true;
      break;
    }
  }
  if (!mayContain) {
    return text;
  }

  const { pair, self } = getNormalizeRegexes(selfClosingTags);
  let result = text.replace(
    pair,
    (_full, tagName: string, attrs: string | undefined) =>
      `<${tagName}${attrs || ""} />`
  );
  result = result.replace(self, (_full, tagName: string, attrs: string) => {
    const trimmed = attrs.trim();
    return trimmed ? `<${tagName} ${trimmed} />` : `<${tagName} />`;
  });
  return result;
}

/** 从标签片段提取标签名 */
function extractTagName(content: string): string {
  return content.match(TAG_NAME_RE)?.[1] || "";
}

/** 折叠空白后分词为 token 序列 */
function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const cleaned = text.replace(/\s+/g, " ").trim();
  TOKEN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TOKEN_RE.exec(cleaned)) !== null) {
    const raw = match[0].trim();
    if (!raw) {
      continue;
    }

    const content = raw.startsWith("<")
      ? raw.replace(/\/\s*>$/, "/>").replace(/\s+>$/, ">")
      : raw;

    if (content.startsWith("<!--")) {
      tokens.push({ type: "comment", content });
    } else if (content === "<") {
      tokens.push({ type: "text", content });
    } else if (content.startsWith("</")) {
      tokens.push({
        type: "close",
        content,
        tagName: extractTagName(content),
      });
    } else if (content.endsWith("/>")) {
      const tagName = extractTagName(content);
      if (!tagName) {
        tokens.push({ type: "text", content });
        continue;
      }
      tokens.push({
        type: "selfClose",
        content,
        tagName,
        attributes: parseAttributes(content.slice(tagName.length + 1, -2)),
      });
    } else if (content.startsWith("<")) {
      const tagName = extractTagName(content);
      if (!tagName) {
        tokens.push({ type: "text", content });
        continue;
      }
      tokens.push({
        type: "open",
        content,
        tagName,
        attributes: parseAttributes(content.slice(tagName.length + 1, -1)),
      });
    } else {
      tokens.push({ type: "text", content });
    }
  }

  return tokens;
}

/** 按深度取缩进字符串，线性缓存避免重复 repeat */
function indentAt(runtime: BuildRuntime, depth: number): string {
  const cache = runtime.indentCache;
  while (cache.length <= depth) {
    cache.push(cache[cache.length - 1] + runtime.indentUnit);
  }
  return cache[depth]!;
}

/** 将 token 序列重建为带缩进的文档 */
function buildDocument(tokens: Token[], runtime: BuildRuntime): string {
  const lines: string[] = [];
  let depth = 0;
  const wrapAt = runtime.wrapAttributes;
  const inlineSet = runtime.inlineTagSet;

  /** 属性数达标或原始开始标签超长则换行 */
  const shouldWrapAttributes = (token: Token): boolean => {
    const attrs = token.attributes;
    if (!attrs || attrs.length === 0) {
      return false;
    }
    if (attrs.length >= wrapAt) {
      return true;
    }
    return (
      token.tagLength !== undefined &&
      token.tagLength > TAG_LENGTH_WRAP_THRESHOLD
    );
  };

  const formatAttr = (attr: ParsedAttribute): string =>
    attr.value ? `${attr.name}=${attr.value}` : attr.name;

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

    // text 特殊：>内容</text> 挂在标签深度行（与末属性分行）
    if (forceTextInlineStyle && shouldInline) {
      lines.push(`${baseIndent}<${tagName}`);
      const attrs = token.attributes;
      if (attrs) {
        for (let j = 0; j < attrs.length; j++) {
          lines.push(attrIndent + formatAttr(attrs[j]!));
        }
      }
      lines.push(
        `${baseIndent}>${nextToken!.content}${nextNextToken!.content}`
      );
      return 2;
    }

    lines.push(`${baseIndent}<${tagName}`);
    const attrs = token.attributes!;
    const lastIndex = attrs.length - 1;

    for (let j = 0; j <= lastIndex; j++) {
      const attrStr = formatAttr(attrs[j]!);
      if (j === lastIndex && shouldInline) {
        // 其它内联标签：末属性同行收口
        lines.push(
          `${attrIndent}${attrStr}>${nextToken!.content}${nextNextToken!.content}`
        );
      } else {
        lines.push(attrIndent + attrStr);
      }
    }

    if (shouldInline) {
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
      lines.push(`${baseIndent}<${token.tagName}`);
      const attrs = token.attributes!;
      const lastIndex = attrs.length - 1;
      for (let j = 0; j <= lastIndex; j++) {
        const attrStr = formatAttr(attrs[j]!);
        const suffix = j === lastIndex ? " />" : "";
        lines.push(attrIndent + attrStr + suffix);
      }
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