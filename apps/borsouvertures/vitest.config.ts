import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromHere = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': fromHere('./site'),
    },
  },
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
