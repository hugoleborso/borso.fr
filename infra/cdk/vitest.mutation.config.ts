import { defineConfig } from 'vitest/config';

/**
 * Stryker's entry point: the pure suites and nothing else.
 *
 * `vitest.config.ts` carries a `globalSetup` reached through `../../scripts/`,
 * which resolves against the repository root and not against the sandbox
 * Stryker copies this workspace into, so a mutation run using that config dies
 * in the dry run on a path that exists nowhere. The snapshot suites it sets up
 * synthesize whole CDK apps, mutate nothing pure, and take tens of seconds.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.utils.test.ts'],
    environment: 'node',
    globals: false,
  },
});
