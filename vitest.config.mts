import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 只跑 test/ 下的 *.test.ts，避免把 bench 等脚本当成测试
    include: ['test/**/*.test.ts'],
    // 格式化核心是纯 Node 代码，不需要浏览器环境
    environment: 'node',
    // 快照与测试报告产物统一放到 .vitest/，见 .gitignore
    dir: '.',
    reporters: ['default'],
  },
});
