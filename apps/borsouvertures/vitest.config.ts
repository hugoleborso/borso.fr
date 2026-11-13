import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const CONFIG_FILES_THAT_RERUN_EVERY_TEST = ['**/{vitest,vite}.config.*'];

const fromHere = (path: string) => fileURLToPath(new URL(path, import.meta.url));

const workspaceAliases = {
  '@': fromHere('./site/src'),
  '@api': fromHere('./api/src'),
  '@domain': fromHere('./domain'),
};

const BACK_END_TESTS_THAT_NEED_NO_DATABASE = [
  'api/src/**/*.core.test.ts',
  'api/src/**/*.utils.test.ts',
  'api/src/**/*.adapter.test.ts',
  'api/src/**/*.schema.test.ts',
];

// @FollowsBlueprint workspace-test-config
export default defineConfig({
  resolve: { alias: workspaceAliases },
  test: {
    forceRerunTriggers: CONFIG_FILES_THAT_RERUN_EVERY_TEST,
    coverage: {
      provider: 'v8',
      reportsDirectory: join(tmpdir(), 'vitest-coverage', String(process.pid)),
      include: [
        'site/**/*.{core,utils,adapter,schema}.ts',
        'domain/**/*.core.ts',
        'api/src/**/*.{core,utils,adapter,schema}.ts',
        'scripts/**/*.core.ts',
        'scripts/**/*.adapter.ts',
      ],
      thresholds: {
        perFile: true,
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
    projects: [
      {
        resolve: { alias: workspaceAliases },
        test: {
          name: 'core',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./site/src/test-setup.ts'],
          include: [
            'site/src/**/*.test.ts',
            'site/src/**/*.test.tsx',
            'domain/**/*.test.ts',
            'scripts/**/*.test.ts',
            ...BACK_END_TESTS_THAT_NEED_NO_DATABASE,
          ],
          sequence: { groupOrder: 0 },
          testTimeout: 30_000,
        },
      },
      {
        resolve: { alias: workspaceAliases },
        test: {
          name: 'back-e2e',
          environment: 'node',
          include: ['api/src/**/*.test.ts', 'test/**/*.test.ts'],
          exclude: BACK_END_TESTS_THAT_NEED_NO_DATABASE,
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
