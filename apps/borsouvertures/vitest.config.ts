import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const CONFIG_FILES_THAT_RERUN_EVERY_TEST = ['**/{vitest,vite}.config.*'];

const fromHere = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// @FollowsBlueprint workspace-test-config
export default defineConfig({
  resolve: {
    alias: {
      '@': fromHere('./site/src'),
      '@domain': fromHere('./domain'),
    },
  },
  test: {
    forceRerunTriggers: CONFIG_FILES_THAT_RERUN_EVERY_TEST,
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./site/src/test-setup.ts'],
    testTimeout: 30_000,
    include: [
      'site/src/**/*.test.ts',
      'site/src/**/*.test.tsx',
      'domain/**/*.test.ts',
      'scripts/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reportsDirectory: join(tmpdir(), 'vitest-coverage', String(process.pid)),
      include: [
        'site/**/*.{core,utils,adapter,schema}.ts',
        'domain/**/*.core.ts',
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
  },
});
