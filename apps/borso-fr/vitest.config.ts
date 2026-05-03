import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['site/**/*.utils.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['site/**/*.utils.ts'],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
