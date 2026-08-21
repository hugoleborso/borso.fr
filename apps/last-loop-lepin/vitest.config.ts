import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromHere = (path: string) => fileURLToPath(new URL(path, import.meta.url));

const workspaceAliases = {
  '@site': fromHere('./site/src'),
  '@api': fromHere('./api/src'),
  '@domain': fromHere('./domain'),
};

// @FollowsBlueprint workspace-test-config
export default defineConfig({
  resolve: { alias: workspaceAliases },
  test: {
    coverage: {
      provider: 'v8',
      include: [
        'api/src/**/*.core.ts',
        'api/src/**/*.utils.ts',
        'api/src/**/*.adapter.ts',
        'api/src/**/*.schema.ts',
        'site/src/**/*.core.ts',
        'site/src/**/*.utils.ts',
        'site/src/**/*.adapter.ts',
        'domain/**/*.core.ts',
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
            'api/src/**/*.adapter.test.ts',
            'api/src/**/*.schema.test.ts',
            'api/src/database/migrations.audit.test.ts',
            'cdk/test/**/*.test.ts',
            'site/src/**/*.utils.test.ts',
            'site/src/**/*.core.test.ts',
            'site/src/**/*.adapter.test.ts',
            'site/src/**/*.test.tsx',
            'domain/**/*.core.test.ts',
          ],
          sequence: { groupOrder: 0 },
          globalSetup: ['../../scripts/vitest-cdk-outdir-teardown.js'],
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
