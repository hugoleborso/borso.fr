import { defineConfig } from 'vitest/config';

/**
 * The repository's own tooling, held to the bar it holds the applications to.
 *
 * The custom lint rules and the generators under `scripts/` decide what every
 * application is allowed to look like, and until this config existed only the
 * lint rules had a suite. A generator that decides whether a standard is
 * enforced is exactly the code that must not be wrong, so its pure modules
 * carry the same full per-file coverage threshold as an application's.
 */
export default defineConfig({
  test: {
    include: ['eslint-rules/**/*.test.js', 'scripts/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['scripts/**/*.{core,utils}.ts'],
      perFile: true,
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
});
