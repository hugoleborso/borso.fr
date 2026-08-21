import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromHere = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// @FollowsBlueprint workspace-test-config
export default defineConfig({
  resolve: {
    alias: {
      '@': fromHere('./site/src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./site/src/test-setup.ts'],
    testTimeout: 30_000,
    include: ['site/src/**/*.test.ts', 'site/src/**/*.test.tsx'],
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
