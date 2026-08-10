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
 *
 * @Blueprint workspace-test-config
 * @BlueprintName Workspace Test Configuration
 * @BlueprintUsage Use for the vitest configuration of a full stack workspace, where fast pure tests and serial database tests have to share one run.
 * @BlueprintDescription Declares the two suites as projects rather than as separate configurations, so one command covers both, and gives each an explicit `sequence.groupOrder` because vitest refuses to schedule projects that disagree on `maxWorkers` inside a single group and aborts the whole run before a test executes. Coverage sits above the projects, since a run has one coverage configuration shared by all of them, and its per-file thresholds name the pure files rather than the whole tree.
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
          // Vitest 4 refuses to schedule two projects that disagree on
          // `maxWorkers` inside one group, so a run covering both projects
          // aborts before a single test executes. The two orders put this
          // project's parallel files first and the serial back-e2e files
          // after, which is the order they would have taken anyway.
          sequence: { groupOrder: 0 },
          // The CDK snapshot tests in this project synthesize a whole app,
          // twice per test (prod and preview), which does not fit the 5 s
          // default. 30 s was enough on an idle machine and not enough under
          // the pre-push hook, which starts four mutation runs and four test
          // runs at once: the same file measures about 15 s alone and timed a
          // push out at 30 s. The budget is for the slowest machine the gate
          // runs on, not the quietest.
          testTimeout: 60_000,
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
          sequence: { groupOrder: 1 },
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
