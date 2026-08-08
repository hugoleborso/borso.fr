import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromHere = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@site': fromHere('./site/src'),
      '@api': fromHere('./api/src'),
    },
  },
  // Coverage is read from the root config only. A `coverage` block inside a
  // project entry of `vitest.workspace.ts` is accepted and ignored, which is
  // how the 100% per-file gate on pure files ran green for months against
  // files that were not at 100%. See
  // docs/dantotsus/per-file-coverage-gate-was-never-armed.md.
  test: {
    coverage: {
      provider: 'v8',
      all: false,
      include: [
        'api/src/**/*.core.ts',
        'api/src/**/*.utils.ts',
        'site/src/**/*.core.ts',
        'site/src/**/*.utils.ts',
      ],
      thresholds: { perFile: true, statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
});
