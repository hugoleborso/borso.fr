import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromHere = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/**
 * Stryker runs against this config rather than the workspace file, so a
 * mutation run executes only the pure suites. The `core` project also holds
 * the CDK snapshot tests, which take tens of seconds and mutate nothing pure,
 * and the `back-e2e` project needs Postgres.
 *
 * See docs/standards/10-testing.md.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@site': fromHere('./site/src'),
      '@api': fromHere('./api/src'),
    },
  },
  test: {
    environment: 'jsdom',
    include: [
      'api/src/**/*.core.test.ts',
      'api/src/**/*.utils.test.ts',
      'site/src/**/*.core.test.ts',
      'site/src/**/*.utils.test.ts',
    ],
  },
});
