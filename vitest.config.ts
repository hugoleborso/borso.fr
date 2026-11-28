import { defineConfig } from 'vitest/config';
import { coverageGate, PURE_FILES } from './scripts/vitest-coverage-gate';

const CONFIG_FILES_THAT_RERUN_EVERY_TEST = ['**/{vitest,vite}.config.*'];

export default defineConfig({
  test: {
    forceRerunTriggers: CONFIG_FILES_THAT_RERUN_EVERY_TEST,
    include: ['eslint-rules/**/*.test.js', 'scripts/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['scripts/git-hook-variables-cleared.setup.ts'],
    coverage: coverageGate({ include: [`scripts/${PURE_FILES}`] }),
  },
});
