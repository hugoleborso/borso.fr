import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['eslint-rules/**/*.test.js', 'scripts/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['scripts/**/*.{core,utils}.ts'],
      perFile: true,
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
});
