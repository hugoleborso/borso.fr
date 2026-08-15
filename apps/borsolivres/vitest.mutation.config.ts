import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromHere = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/**
 * Stryker's entry point: the suites over the gated files and nothing else. The
 * `core` project of `vitest.config.ts` also carries the CDK snapshot tests,
 * which take tens of seconds and mutate nothing gated, and `back-e2e` needs a
 * Postgres.
 */
export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          alias: {
            '@site': fromHere('./site/src'),
            '@api': fromHere('./api/src'),
          },
        },
        test: {
          name: 'pure',
          environment: 'jsdom',
          include: [
            'api/src/**/*.core.test.ts',
            'api/src/**/*.utils.test.ts',
            'api/src/**/*.adapter.test.ts',
            'site/src/**/*.core.test.ts',
            'site/src/**/*.utils.test.ts',
          ],
        },
      },
    ],
  },
});
