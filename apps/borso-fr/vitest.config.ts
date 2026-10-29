import { defineConfig } from 'vitest/config';

const CONFIG_FILES_THAT_RERUN_EVERY_TEST = ['**/{vitest,vite}.config.*'];

// @FollowsBlueprint workspace-test-config
export default defineConfig({
  test: {
    forceRerunTriggers: CONFIG_FILES_THAT_RERUN_EVERY_TEST,
    environment: 'jsdom',
    setupFiles: ['./site/src/test-setup.ts'],
    include: ['site/src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['site/**/*.{core,utils,adapter,schema}.ts'],
      thresholds: {
        perFile: true,
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
