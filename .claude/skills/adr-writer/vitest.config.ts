import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.utils.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.utils.ts'],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
