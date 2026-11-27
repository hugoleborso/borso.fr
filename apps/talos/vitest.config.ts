import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { coverageGate } from '../../scripts/vitest-coverage-gate';

const CONFIG_FILES_THAT_RERUN_EVERY_TEST = ['**/{vitest,vite}.config.*'];

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
    forceRerunTriggers: CONFIG_FILES_THAT_RERUN_EVERY_TEST,
    coverage: coverageGate(),
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
            'site/src/**/*.test.{ts,tsx}',
          ],
          globalSetup: ['../../scripts/vitest-cdk-outdir-teardown.js'],
          setupFiles: ['../../scripts/vitest-jsdom-missing-apis.js'],
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
          fileParallelism: false,
          sequence: { groupOrder: 1 },
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
