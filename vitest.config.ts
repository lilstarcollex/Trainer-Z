import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    fileParallelism: false,
    poolOptions: { threads: { singleThread: true } },
    coverage: {
      provider: 'v8',
      exclude: ['tests/**', 'smoke.ts', 'dist/**', 'prisma/**', 'vitest.config.ts']
    }
  },
});
