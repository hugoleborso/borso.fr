import { defineConfig } from 'vitest/config';

// @FollowsBlueprint workspace-test-config
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./site/test-setup.ts'],
    include: ['site/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['site/**/*.{core,utils}.ts', 'site/**/*.adapter.ts'],
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
