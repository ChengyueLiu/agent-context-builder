import { defineConfig } from 'vitest/config';

// 单独的配置：vite.config.ts 的 root 指向网页目录，测试要从仓库根目录跑。
export default defineConfig({
  test: { include: ['test/**/*.test.ts'] },
});
