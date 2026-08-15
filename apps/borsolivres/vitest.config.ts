import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromHere = (path: string) => fileURLToPath(new URL(path, import.meta.url));

const workspaceAliases = {
  '@site': fromHere('./site/src'),
  '@api': fromHere('./api/src'),
};

/**
 * The coverage `include` names three suffixes rather than two. An
 * `*.adapter.ts` is impure, and it is also the one file in a bounded context
 * that leaves the process, so it is the highest risk file in the slice — and
 * the cheapest impure file to drive, because the fetcher, the clock and the
 * cache all arrive as options. `stryker.config.js` mutates the same set.
 *
 * // @FollowsBlueprint workspace-test-config
 */
export default defineConfig({
  resolve: { alias: workspaceAliases },
  test: {
    coverage: {
      provider: 'v8',
      include: ['api/src/**/*.{core,utils,adapter}.ts', 'site/src/**/*.{core,utils,adapter}.ts'],
      thresholds: { perFile: true, statements: 100, branches: 100, functions: 100, lines: 100 },
    },
    projects: [
      {
        resolve: { alias: workspaceAliases },
        test: {
          name: 'core',
          environment: 'jsdom',
          include: [
            'api/src/**/*.core.test.ts',
            'api/src/**/*.utils.test.ts',
            'api/src/**/*.adapter.test.ts',
            'cdk/test/**/*.test.ts',
            'site/src/**/*.core.test.ts',
            'site/src/**/*.utils.test.ts',
            'site/src/**/*.test.tsx',
          ],
          // Synthesising the CDK app twice per case, once per stage, does not
          // fit the 5 s default, and the pre-push hook runs several suites at
          // once. The budget is for the busiest machine the gate runs on.
          testTimeout: 60_000,
          // Vitest refuses to schedule two projects that disagree on
          // `maxWorkers` inside one group, so a run covering both aborts
          // before a test executes. Parallel pure files first, serial
          // database files after.
          sequence: { groupOrder: 0 },
        },
      },
      {
        resolve: { alias: workspaceAliases },
        test: {
          name: 'back-e2e',
          environment: 'node',
          include: ['api/src/**/*.test.ts', 'test/**/*.test.ts'],
          exclude: [
            'api/src/**/*.core.test.ts',
            'api/src/**/*.utils.test.ts',
            'api/src/**/*.adapter.test.ts',
          ],
          globalSetup: ['./test/setup-postgres.ts'],
          // One shared Postgres across the back-e2e suites, so a parallel
          // truncate in one file would wipe another file's rows.
          pool: 'forks',
          maxWorkers: 1,
          isolate: false,
          fileParallelism: false,
          sequence: { groupOrder: 1 },
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
