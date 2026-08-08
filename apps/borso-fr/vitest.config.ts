import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./site/test-setup.ts'],
    include: ['site/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['site/**/*.{core,utils}.ts'],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
