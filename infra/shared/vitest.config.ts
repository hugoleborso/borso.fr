import { defineConfig } from 'vitest/config';
import { coverageGate } from '../../scripts/vitest-coverage-gate';

// @FollowsBlueprint workspace-test-config
export default defineConfig({
  test: {
    include: ['test/unit/**/*.test.ts'],
    globalSetup: ['../../scripts/vitest-cdk-outdir-teardown.js'],
    environment: 'node',
    globals: false,
    testTimeout: 60_000,
    coverage: coverageGate({ include: ['lib/**/*.ts'], exclude: ['lib/**/*.test.ts'] }),
  },
});
