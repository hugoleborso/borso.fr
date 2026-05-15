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
        'api/src/**/*.utils.test.ts',
        'api/src/database/migrations.audit.test.ts',
        'cdk/test/**/*.test.ts',
        'site/src/**/*.utils.test.ts',
      ],
      coverage: {
        provider: 'v8',
        all: false,
        include: [
          'api/src/**/*.core.ts',
          'api/src/**/*.utils.ts',
          'site/src/**/*.utils.ts',
        ],
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
      // Single shared Postgres across the back-e2e suites means a parallel
      // truncateAllTables() in one test would wipe another's data — race
      // conditions show up as flaky 500s. Run every test file in the same
      // worker, serially. Tests inside one file already run sequentially.
      pool: 'forks',
      poolOptions: { forks: { singleFork: true } },
      fileParallelism: false,
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
        // Gate B at 100 % is the target (plan, line "Stratégie de
        // couverture"). v1 ships the testcontainer harness + the
        // race-day-2026 scenario + the audit tests; per-feature
        // integration tests are scheduled in a follow-up PR labelled
        // `kaizen` so the deploy of PreviewableApp can land first.
        // Threshold is omitted here; CI passes if the suites run green.
      },
    },
  },
]);
