import { fileURLToPath } from 'node:url';
import { defineWorkspace } from 'vitest/config';

const fromHere = (path: string) => fileURLToPath(new URL(path, import.meta.url));

const COVERAGE_THRESHOLDS = {
  statements: 100,
  branches: 100,
  functions: 100,
  lines: 100,
};

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
        'api/src/**/*.schema.test.ts',
        'site/src/**/*.utils.test.ts',
      ],
      coverage: {
        provider: 'v8',
        all: false,
        include: ['api/src/**/*.core.ts', 'site/src/**/*.utils.ts'],
        thresholds: { perFile: true, ...COVERAGE_THRESHOLDS },
      },
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
      globalSetup: ['./test/setup-postgres.ts'],
      testTimeout: 30_000,
      hookTimeout: 60_000,
      coverage: {
        provider: 'v8',
        include: ['api/src/**/*.ts'],
        exclude: [
          'api/src/**/*.test.ts',
          'api/src/**/*.schema.ts',
          'api/src/**/*.types.ts',
          'api/src/main.ts',
          'api/src/main.dev.ts',
          'api/src/__test/**',
        ],
        thresholds: { perFile: true, ...COVERAGE_THRESHOLDS },
      },
    },
  },
]);
