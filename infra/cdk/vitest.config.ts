import { defineConfig } from 'vitest/config';

// @FollowsBlueprint workspace-test-config
export default defineConfig({
  test: {
    include: ['test/unit/**/*.test.ts', 'src/**/*.test.ts'],
    globalSetup: ['../../scripts/vitest-cdk-outdir-teardown.js'],
    environment: 'node',
    globals: false,
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
