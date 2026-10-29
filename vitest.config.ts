import { defineConfig } from 'vitest/config';

const CONFIG_FILES_THAT_RERUN_EVERY_TEST = ['**/{vitest,vite}.config.*'];

export default defineConfig({
  test: {
    forceRerunTriggers: CONFIG_FILES_THAT_RERUN_EVERY_TEST,
    include: ['eslint-rules/**/*.test.js', 'scripts/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['scripts/**/*.{core,utils}.ts'],
      thresholds: { perFile: true, statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
});
