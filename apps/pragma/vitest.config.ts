import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromHere = (path: string) => fileURLToPath(new URL(path, import.meta.url));

const workspaceAliases = {
  '@site': fromHere('./site/src'),
  '@api': fromHere('./api/src'),
};

/**
 * Projects live here rather than in a `vitest.workspace.ts`. Vitest 4 removed
 * the separate workspace file, and with it the discovery rule that made a
 * config's own `test.include` losable: a file sitting beside the config used to
 * win over it, silently, which is how the mutation gate on this app ran for a
 * branch without ever reaching a mutant. See
 * docs/dantotsus/a-mutation-config-a-workspace-file-overruled.md.
 *
 * Coverage stays at the top level because there is exactly one coverage
 * configuration per run, shared by every project in it. See
 * docs/dantotsus/per-file-coverage-gate-was-never-armed.md.
 */
export default defineConfig({
  resolve: { alias: workspaceAliases },
  test: {
    coverage: {
      provider: 'v8',
      include: [
        'api/src/**/*.core.ts',
        'api/src/**/*.utils.ts',
        'site/src/**/*.core.ts',
        'site/src/**/*.utils.ts',
      ],
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
            'cdk/test/**/*.test.ts',
            'site/src/**/*.utils.test.ts',
            'site/src/**/*.core.test.ts',
            'site/src/**/*.test.tsx',
          ],
          globalSetup: ['../../scripts/vitest-cdk-outdir-teardown.js'],
          // The CDK snapshot tests in this project synthesize a whole app,
          // twice per test (prod and preview), which does not fit the 5 s
          // default. infra/cdk gives the same kind of test 30 s for the same
          // reason; matching it here removes a failure that depended on how
          // busy the machine was.
          testTimeout: 30_000,
        },
      },
      {
        resolve: { alias: workspaceAliases },
        test: {
          name: 'back-e2e',
          environment: 'node',
          include: ['api/src/**/*.test.ts', 'test/**/*.test.ts'],
          exclude: ['api/src/**/*.core.test.ts', 'api/src/**/*.utils.test.ts'],
          globalSetup: ['./test/setup-postgres.ts'],
          // Single shared Postgres across the back-e2e suites means a parallel
          // truncateAllTables() in one test would wipe another's data — race
          // conditions show up as flaky 500s. One worker, no isolation, every
          // file serial. Tests inside one file already run sequentially.
          pool: 'forks',
          maxWorkers: 1,
          isolate: false,
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
