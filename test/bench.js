/**
 * 简易性能基准：生成合成 WXML，多次 format 取平均耗时
 * 用法：node test/bench.js
 */
const { formatWxml, createDefaultConfig } = require('../out/format-core');

function buildSample(repeat) {
  const chunks = [];
  for (let i = 0; i < repeat; i++) {
    chunks.push(
      `<view class="row-${i}" data-id="{{item${i}.id}}" wx:if="{{visible${i}}}">` +
        `<text class="title" data-index="${i}">标题${i}</text>` +
        `<image src="{{avatar${i}}}" mode="aspectFit"></image>` +
        `<button bind:tap="onTap" catch:touchstart="onTouch" data-type="{{t${i}}}" disabled="{{loading}}">按钮${i}</button>` +
      `</view>`
    );
  }
  return `<view class="container">${chunks.join('')}</view>`;
}

function bench() {
  const config = createDefaultConfig();
  const sample = buildSample(200);
  // 预热
  for (let i = 0; i < 5; i++) formatWxml(sample, config);

  const rounds = 50;
  const start = process.hrtime.bigint();
  let outLen = 0;
  for (let i = 0; i < rounds; i++) {
    outLen = formatWxml(sample, config).length;
  }
  const end = process.hrtime.bigint();
  const totalMs = Number(end - start) / 1e6;
  const avgMs = totalMs / rounds;
  console.log(
    JSON.stringify(
      {
        inputChars: sample.length,
        outputChars: outLen,
        rounds,
        totalMs: Number(totalMs.toFixed(2)),
        avgMs: Number(avgMs.toFixed(3)),
        charsPerSec: Math.round((sample.length * rounds) / (totalMs / 1000)),
      },
      null,
      2
    )
  );
}

bench();