import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromHere = (path: string) => fileURLToPath(new URL(path, import.meta.url));

const workspaceAliases = {
  '@site': fromHere('./site/src'),
  '@api': fromHere('./api/src'),
  '@domain': fromHere('./domain'),
};

/**
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
        'domain/**/*.core.ts',
        'api/src/**/*.core.ts',
        'api/src/**/*.utils.ts',
        'api/src/**/*.adapter.ts',
        'api/src/**/*.schema.ts',
        'site/src/**/*.core.ts',
        'site/src/**/*.utils.ts',
        'site/src/**/*.adapter.ts',
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
            'domain/**/*.core.test.ts',
            'api/src/**/*.core.test.ts',
            'api/src/**/*.utils.test.ts',
            'api/src/**/*.adapter.test.ts',
            'api/src/**/*.schema.test.ts',
            'cdk/test/**/*.test.ts',
            'site/src/**/*.utils.test.ts',
            'site/src/**/*.core.test.ts',
            'site/src/**/*.adapter.test.ts',
            'site/src/**/*.test.tsx',
          ],
          globalSetup: ['../../scripts/vitest-cdk-outdir-teardown.js'],
          sequence: { groupOrder: 0 },
          testTimeout: 60_000,
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
            'api/src/**/*.schema.test.ts',
          ],
          globalSetup: ['./test/setup-postgres.ts'],
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
