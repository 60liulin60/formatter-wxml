import { describe, expect, it } from 'vitest';

import {
  applyBaseIndent,
  createDefaultConfig,
  formatWxml,
  trimTrailingNewlines,
} from '../src/format-core';
import type { FormatterConfig } from '../src/defaults';

/** 测试使用的默认配置（与插件默认一致） */
const mockConfig = createDefaultConfig();

/** 与插件一致的格式化入口 */
function format(text: string): string {
  return formatWxml(text, mockConfig);
}

/**
 * 格式化用例。
 * - 带 expected 的做严格比对，expected 是人工审定的期望输出，不要用快照自动覆盖
 * - 不带 expected 的只校验幂等性，并由快照记录当前输出，改动时能看到 diff
 */
const testCases = [
  {
    name: '简单WXML格式化',
    input:
      '<view class="container"><text wx:if="{{show}}">Hello World</text><button bind:tap="onTap" class="btn">Click Me</button></view>',
    description: '测试基本的WXML元素格式化',
    expected: `<view class="container">
  <text wx:if="{{show}}">Hello World</text>
  <button bind:tap="onTap" class="btn">Click Me</button>
</view>
`,
  },
  {
    name: '条件渲染格式化',
    input:
      '<view><text wx:if="{{condition}}">显示文本</text><text wx:elif="{{other}}">其他文本</text><text wx:else>默认文本</text></view>',
    description: '测试wx:if, wx:elif, wx:else的格式化',
    expected: `<view>
  <text wx:if="{{condition}}">显示文本</text>
  <text wx:elif="{{other}}">其他文本</text>
  <text wx:else>默认文本</text>
</view>
`,
  },
  {
    name: '列表渲染格式化',
    input:
      '<view wx:for="{{list}}" wx:key="id" wx:for-item="item" wx:for-index="index"><text>{{item.name}}</text></view>',
    description: '测试wx:for循环的格式化',
    expected: `<view
  wx:for="{{list}}"
  wx:key="id"
  wx:for-item="item"
  wx:for-index="index"
>
  <text>{{item.name}}</text>
</view>
`,
  },
  {
    name: '事件绑定格式化',
    input:
      '<button bind:tap="onTap" catch:touchstart="onTouch" capture-bind:longpress="onLongPress">按钮</button>',
    description: '测试各种事件绑定的格式化',
    expected: `<button
  bind:tap="onTap"
  catch:touchstart="onTouch"
  capture-bind:longpress="onLongPress"
>
  按钮
</button>
`,
  },
  {
    name: '双花括号表达式保护',
    input:
      '<text>{{user.name + " - " + user.age}}</text><view class="{{isActive ? \'active\' : \'inactive\'}}">内容</view>',
    description: '测试复杂表达式的保护',
    expected: `<text>{{user.name + " - " + user.age}}</text>
<view class="{{isActive ? 'active' : 'inactive'}}">内容</view>
`,
  },
  {
    name: '复杂嵌套表达式',
    input:
      '<view class="{{item.status === \'active\' ? (item.type === \'vip\' ? \'vip-active\' : \'normal-active\') : \'inactive\'}}"><text>{{item.data && item.data.user ? item.data.user.name : \'未知用户\'}}</text></view>',
    description: '测试复杂嵌套的双花括号表达式',
    expected: `<view
  class="{{item.status === 'active' ? (item.type === 'vip' ? 'vip-active' : 'normal-active') : 'inactive'}}"
>
  <text>{{item.data && item.data.user ? item.data.user.name : '未知用户'}}</text>
</view>
`,
  },
  {
    name: '自闭合标签格式化',
    input:
      '<view><image src="{{avatar}}" mode="aspectFit"></image><input type="text" placeholder="请输入"></input><icon type="success" size="20"></icon></view>',
    description: '测试自闭合标签的格式化',
    expected: `<view>
  <image src="{{avatar}}" mode="aspectFit" />
  <input type="text" placeholder="请输入" />
  <icon type="success" size="20" />
</view>
`,
  },
  {
    name: '多属性标签换行',
    input:
      '<button class="btn" style="color: red;" bind:tap="onTap" data-id="{{item.id}}" data-type="{{item.type}}" disabled="{{loading}}">提交</button>',
    description: '测试多属性标签的换行格式化',
    expected: `<button
  class="btn"
  style="color: red;"
  bind:tap="onTap"
  data-id="{{item.id}}"
  data-type="{{item.type}}"
  disabled="{{loading}}"
>
  提交
</button>
`,
  },
  {
    name: '微信小程序组件',
    input:
      '<scroll-view scroll-y="true" class="scroll-area"><swiper indicator-dots="{{true}}" autoplay="{{false}}" interval="{{5000}}"><swiper-item><image src="{{item.url}}" mode="aspectFill"></image></swiper-item></swiper></scroll-view>',
    description: '测试微信小程序特有组件的格式化',
    expected: `<scroll-view scroll-y="true" class="scroll-area">
  <swiper
    indicator-dots="{{true}}"
    autoplay="{{false}}"
    interval="{{5000}}"
  >
    <swiper-item>
      <image src="{{item.url}}" mode="aspectFill" />
    </swiper-item>
  </swiper>
</scroll-view>
`,
  },
  {
    name: '表单组件格式化',
    input:
      '<form bind:submit="onSubmit"><input name="username" placeholder="用户名" value="{{form.username}}" bind:input="onInput"/><textarea name="content" placeholder="请输入内容" value="{{form.content}}" bind:input="onTextareaInput"></textarea><button form-type="submit">提交</button></form>',
    description: '测试表单相关组件的格式化',
    expected: `<form bind:submit="onSubmit">
  <input
    name="username"
    placeholder="用户名"
    value="{{form.username}}"
    bind:input="onInput" />
  <textarea
    name="content"
    placeholder="请输入内容"
    value="{{form.content}}"
    bind:input="onTextareaInput"
  >
  </textarea>
  <button form-type="submit">提交</button>
</form>
`,
  },
  {
    name: '标签层级和换行测试',
    input:
      '<view class="container"><view class="header"><text class="title">标题</text></view><view class="content"><view class="item"><text>项目1</text></view><view class="item"><text>项目2</text></view></view></view>',
    description: '测试标签层级缩进和换行是否正确',
    expected: `<view class="container">
  <view class="header">
    <text class="title">标题</text>
  </view>
  <view class="content">
    <view class="item">
      <text>项目1</text>
    </view>
    <view class="item">
      <text>项目2</text>
    </view>
  </view>
</view>
`,
  },
  {
    name: 'Swiper组件换行测试',
    input:
      '<swiper indicator-dots="true"><swiper-item><view>页面1</view></swiper-item><swiper-item><view>页面2</view></swiper-item></swiper>',
    description: '测试swiper组件的换行格式化',
    expected: `<swiper indicator-dots="true">
  <swiper-item>
    <view>页面1</view>
  </swiper-item>
  <swiper-item>
    <view>页面2</view>
  </swiper-item>
</swiper>
`,
  },
  {
    name: '布尔属性保留测试',
    input: '<input type="text" disabled required placeholder="请输入" maxlength="100" />',
    description: '测试布尔属性（disabled、required）的保留',
    expected: `<input
  type="text"
  disabled
  required
  placeholder="请输入"
  maxlength="100" />
`,
  },
  {
    name: '长标签换行测试',
    input:
      '<view class="very-long-class-name-that-makes-the-tag-exceed-100-characters" data-id="12345" style="color: red;">内容</view>',
    description: '测试标签长度超过100字符时的换行',
    expected: `<view
  class="very-long-class-name-that-makes-the-tag-exceed-100-characters"
  data-id="12345"
  style="color: red;"
>
  内容
</view>
`,
  },
  {
    name: '标签结束符号不在同一行格式化问题',
    input:
      '<text class="tip-wrap cashback-wrap" wx:if="{{item.incomeSource && item.incomeSource === \'platform_cashback\'}}" >限时奖励</text>',
    description: '测试开始标签的 > 与属性不同行时，内联 text 标签仍保持同一行',
    expected: `<text
  class="tip-wrap cashback-wrap"
  wx:if="{{item.incomeSource && item.incomeSource === 'platform_cashback'}}"
>限时奖励</text>
`,
  },
  {
    name: 'text 标签格式化问题 - 多属性换行仍应同行输出',
    input:
      '<text class="title" data-id="123" bind:tap="handleTap" style="color:red">这是文本内容</text>',
    description:
      '测试 text 标签多属性换行时，内容与 </text> 仍与最后一个属性行保持同一行',
    expected: `<text
  class="title"
  data-id="123"
  bind:tap="handleTap"
  style="color:red"
>这是文本内容</text>
`,
  },
  {
    name: 'text 标签格式化问题 - 布尔属性换行仍应同行输出',
    input:
      '<text class="asda" tabindex assdassd asd>asdasdasdsaaszdasd asdasdasd asdasd asd asd asd asd asd asd asd a</text>',
    description:
      '测试 text 标签包含布尔属性且触发换行时，内容与 </text> 仍与最后一个属性行保持同一行',
    expected: `<text
  class="asda"
  tabindex
  assdassd
  asd
>asdasdasdsaaszdasd asdasdasd asdasd asd asd asd asd asd asd asd a</text>
`,
  },
  {
    name: 'text 标签格式化问题 - 小于阈值保持单行',
    input: '<text class="tip-wrap cashback-wrap">限时奖励</text>',
    description: '测试 text 标签属性少于3且标签长度不超过100时保持单行',
    expected: `<text class="tip-wrap cashback-wrap">限时奖励</text>
`,
  },
  {
    name: '同名标签多次出现时长度阈值仍正确',
    input:
      '<view class="short"><text class="a">一</text></view><view class="very-long-class-name-that-makes-the-tag-exceed-100-characters-xxxxxxxxxxxx" data-id="1">二</view>',
    description: '覆盖原 originalLength 按位置匹配失败：两个 view 中仅超长者应属性换行',
    expected: `<view class="short">
  <text class="a">一</text>
</view>
<view
  class="very-long-class-name-that-makes-the-tag-exceed-100-characters-xxxxxxxxxxxx"
  data-id="1"
>
  二
</view>
`,
  },
  {
    name: '注释伪标签不污染长度判定',
    input: `<!-- <view class="${'x'.repeat(120)}"> --><view class="short">内容</view>`,
    description: '测试注释内的超长伪标签不会使后续短标签误换行',
    expected: `<!-- <view class="${'x'.repeat(120)}"> -->
<view class="short">内容</view>
`,
  },
  {
    name: '属性值包含大于号',
    input: '<view data-text="a > b"><text>x</text></view>',
    description: '测试引号内的大于号不会提前截断开始标签',
    expected: `<view data-text="a > b">
  <text>x</text>
</view>
`,
  },
  {
    name: '表达式与事件指令直接解析',
    input: '<view wx:if="{{count > 0}}" bind:tap="handleTap"><text>{{user.name}}</text></view>',
    description: '测试不使用占位符时仍能完整保留表达式与指令名',
    expected: `<view wx:if="{{count > 0}}" bind:tap="handleTap">
  <text>{{user.name}}</text>
</view>
`,
  },
];

describe('WXML 格式化', () => {
  it.each(testCases)('$name', ({ name, description, input, expected }) => {
    const formatted = format(input);
    expect(formatted, `${name}｜${description}`).toBe(expected);
  });

  // 所有用例都验证二次格式化稳定，防止输出逐次漂移
  it.each(testCases)('$name 二次格式化保持稳定', ({ input }) => {
    const once = format(input);
    expect(format(once)).toBe(once);
  });
});

/** 一行多个属性的用例配置覆盖项 */
type PackOverrides = Partial<
  Pick<
    FormatterConfig,
    'packAttributes' | 'attributesPerLine' | 'attributeLineWidth'
  >
>;

interface PackCase {
  name: string;
  input: string;
  expected: string;
  config?: PackOverrides;
}

/**
 * 开启「一行多个属性」后的回归用例。
 * 数量与宽度任一超限就换行，续行继续按数量 / 宽度贪心分组。
 */
const packTestCases: PackCase[] = [
  {
    name: '装得下时保持一行',
    input: '<view class="a" data-id="1">x</view>',
    expected: `<view class="a" data-id="1">x</view>
`,
  },
  {
    name: '超过每行数量后换行并继续多个',
    input: '<view a="1" b="2" c="3" d="4" e="5">x</view>',
    expected: `<view a="1" b="2" c="3"
  d="4" e="5"
>
  x
</view>
`,
  },
  {
    name: '宽度不足时按宽度换行并继续多个',
    input:
      '<view aaaa="1111111111" bbbb="2222222222" cccc="3333333333" dddd="4444444444" eeee="5555555555">x</view>',
    config: { attributeLineWidth: 55 },
    expected: `<view aaaa="1111111111" bbbb="2222222222"
  cccc="3333333333" dddd="4444444444" eeee="5555555555"
>
  x
</view>
`,
  },
  {
    name: '单个属性超宽时独占一行',
    input: `<view class="x" data-long="${'y'.repeat(120)}">t</view>`,
    config: { attributeLineWidth: 55 },
    expected: `<view class="x"
  data-long="${'y'.repeat(120)}"
>
  t
</view>
`,
  },
  {
    name: '数量与宽度为 0 时不限',
    input:
      '<view aaaa="1111111111" bbbb="2222222222" cccc="3333333333" dddd="4444444444" eeee="5555555555">x</view>',
    config: { attributesPerLine: 0, attributeLineWidth: 0 },
    expected: `<view aaaa="1111111111" bbbb="2222222222" cccc="3333333333" dddd="4444444444" eeee="5555555555">x</view>
`,
  },
  {
    name: 'text 标签跨行后内容仍与末属性行收口',
    input:
      '<text class="title" data-id="1" bind:tap="onTap" style="color:red">这是文本内容</text>',
    expected: `<text class="title" data-id="1" bind:tap="onTap"
  style="color:red"
>这是文本内容</text>
`,
  },
  {
    name: '自闭合标签跨行后收口符号跟随末行',
    input:
      '<image src="{{a}}" mode="aspectFill" class="avatar" lazy-load="{{true}}" />',
    expected: `<image src="{{a}}" mode="aspectFill" class="avatar"
  lazy-load="{{true}}" />
`,
  },
  {
    name: '嵌套标签按各自缩进分组',
    input:
      '<view class="outer" a="1" b="2"><view class="inner" c="3" d="4">x</view></view>',
    config: { attributesPerLine: 2 },
    expected: `<view class="outer" a="1"
  b="2"
>
  <view class="inner" c="3"
    d="4"
  >
    x
  </view>
</view>
`,
  },
  {
    name: '关闭开关时保持每行一个属性',
    input: '<view a="1" b="2" c="3" d="4">x</view>',
    config: { packAttributes: false },
    expected: `<view
  a="1"
  b="2"
  c="3"
  d="4"
>
  x
</view>
`,
  },
];

/** 按用例覆盖项运行一行多个属性格式化（默认开启） */
function runPackCase(input: string, config?: PackOverrides): string {
  return formatWxml(input, { ...mockConfig, packAttributes: true, ...config });
}

describe('一行多个属性', () => {
  it.each(packTestCases)('$name', ({ name, input, expected, config }) => {
    expect(runPackCase(input, config), name).toBe(expected);
  });

  // 换行后的输出再格式化一次不应继续漂移
  it.each(packTestCases)('$name 二次格式化保持稳定', ({ input, config }) => {
    const once = runPackCase(input, config);
    expect(runPackCase(once, config)).toBe(once);
  });
});

/**
 * 选区格式化辅助函数的回归用例。
 * 这两个函数保证「选区格式化不丢层级缩进」，见 src/format-core.ts
 */
describe('选区格式化辅助函数', () => {
  const rangeHelperCases = [
    {
      name: 'trimTrailingNewlines 去掉尾部换行',
      actual: () => trimTrailingNewlines('<view />\n'),
      expected: '<view />',
    },
    {
      name: 'trimTrailingNewlines 去掉多个尾部换行',
      actual: () => trimTrailingNewlines('<view />\n\n\n'),
      expected: '<view />',
    },
    {
      name: 'trimTrailingNewlines 保留中间换行',
      actual: () => trimTrailingNewlines('a\nb\n'),
      expected: 'a\nb',
    },
    {
      name: 'applyBaseIndent 为每个非空行补缩进',
      actual: () => applyBaseIndent('<view>\n  <text>x</text>\n</view>', '    '),
      expected: '    <view>\n      <text>x</text>\n    </view>',
    },
    {
      name: 'applyBaseIndent 跳过空行不补缩进',
      actual: () => applyBaseIndent('a\n\nb', '  '),
      expected: '  a\n\n  b',
    },
    {
      name: 'applyBaseIndent 基准缩进为空时原样返回',
      actual: () => applyBaseIndent('<view />', ''),
      expected: '<view />',
    },
    {
      name: '选区格式化保留基准缩进（端到端模拟）',
      // 模拟：选区两行缩进 2 空格 → 格式化 → 收回基准缩进
      actual: () =>
        applyBaseIndent(trimTrailingNewlines(format('  <text>a</text>\n  <text>b</text>')), '  '),
      expected: '  <text>a</text>\n  <text>b</text>',
    },
  ];

  it.each(rangeHelperCases)('$name', ({ actual, expected }) => {
    expect(actual()).toBe(expected);
  });
});
