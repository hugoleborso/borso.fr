import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromHere = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// @FollowsBlueprint workspace-test-config
export default defineConfig({
  resolve: {
    alias: {
      '@': fromHere('./site'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./site/test-setup.ts'],
    // Mounting the board renders sixty-four squares and thirty-two pieces
    // through react-chessboard, which does not fit vitest's five second
    // default once the pre-push hook is running its gates in parallel. Every
    // other workspace here already sets an explicit budget.
    testTimeout: 30_000,
    include: ['site/**/*.test.ts', 'site/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      include: ['site/**/*.utils.ts', 'site/**/*.core.ts'],
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
