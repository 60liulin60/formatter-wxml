/**
 * WXML 格式化默认配置与阈值常量
 * 仅包含当前真实生效的选项，避免与未实现配置混用
 */

/** 开始标签长度超过该值时强制属性换行（与 wrapAttributes 二选一触发；packAttributes 开启后不参与判定） */
export const TAG_LENGTH_WRAP_THRESHOLD = 100;

/** 短文本标签保持单行的内容长度上限 */
export const SHORT_TEXT_INLINE_LIMIT = 50;

/** 一行多个属性模式下，每行默认属性个数 */
export const DEFAULT_ATTRIBUTES_PER_LINE = 3;

/** 一行多个属性模式下，属性行默认最大宽度（字符数） */
export const DEFAULT_ATTRIBUTE_LINE_WIDTH = 100;

/** 默认自闭合标签 */
export const DEFAULT_SELF_CLOSING_TAGS: string[] = [
  "image",
  "input",
  "icon",
  "video",
  "audio",
  "camera",
  "live-player",
  "live-pusher",
  "map",
  "canvas",
  "web-view",
  "ad",
  "official-account",
  "open-data",
];

/** 默认内联标签（内容尽量与标签同行） */
export const DEFAULT_INLINE_TAGS: string[] = ["text", "icon", "rich-text"];

/** 格式化器运行时配置（仅生效字段） */
export interface FormatterConfig {
  /** 缩进空格数 */
  indentSize: number;
  /** 属性数达到该阈值时换行（packAttributes 开启后不参与判定） */
  wrapAttributes: number;
  /** 需要规范为自闭合的标签名 */
  selfClosingTags: string[];
  /** 内联标签名 */
  inlineTags: string[];
  /** 是否开启一行多个属性 */
  packAttributes: boolean;
  /** 一行多个属性时每行最多属性个数；<= 0 表示不限制 */
  attributesPerLine: number;
  /** 一行多个属性时属性行最大宽度；<= 0 表示不限制 */
  attributeLineWidth: number;
}

/** 生成默认配置副本，避免外部修改污染默认值 */
export function createDefaultConfig(): FormatterConfig {
  return {
    indentSize: 2,
    wrapAttributes: 3,
    selfClosingTags: [...DEFAULT_SELF_CLOSING_TAGS],
    inlineTags: [...DEFAULT_INLINE_TAGS],
    packAttributes: false,
    attributesPerLine: DEFAULT_ATTRIBUTES_PER_LINE,
    attributeLineWidth: DEFAULT_ATTRIBUTE_LINE_WIDTH,
  };
}