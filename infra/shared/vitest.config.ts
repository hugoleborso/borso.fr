import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from 'vitest/config';

// @FollowsBlueprint workspace-test-config
export default defineConfig({
  test: {
    include: ['test/unit/**/*.test.ts'],
    globalSetup: ['../../scripts/vitest-cdk-outdir-teardown.js'],
    environment: 'node',
    globals: false,
    testTimeout: 60_000,
    coverage: {
      provider: 'v8',
      reportsDirectory: join(tmpdir(), 'vitest-coverage', String(process.pid)),
      reporter: ['text', 'lcov', 'html'],
      include: ['lib/**/*.ts'],
      exclude: ['lib/**/*.test.ts'],
      thresholds: {
        perFile: true,
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
