import { fileURLToPath } from 'node:url';
import { defineWorkspace } from 'vitest/config';

const fromHere = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineWorkspace([
  {
    resolve: {
      alias: {
        '@site': fromHere('./site/src'),
        '@api': fromHere('./api/src'),
      },
    },
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
    },
  },
  {
    resolve: {
      alias: {
        '@site': fromHere('./site/src'),
        '@api': fromHere('./api/src'),
      },
    },
    test: {
      name: 'back-e2e',
      environment: 'node',
      include: ['api/src/**/*.test.ts', 'test/**/*.test.ts'],
      exclude: ['api/src/**/*.core.test.ts', 'api/src/**/*.utils.test.ts'],
      globalSetup: ['./test/setup-postgres.ts'],
      pool: 'forks',
      poolOptions: { forks: { singleFork: true } },
      fileParallelism: false,
      testTimeout: 30_000,
      hookTimeout: 60_000,
    },
  },
]);
