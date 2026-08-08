import { fileURLToPath } from 'node:url';
import { defineWorkspace } from 'vitest/config';

const fromHere = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/**
 * The single project a mutation run executes: the pure suites and nothing else.
 * The `core` project of `vitest.workspace.ts` also holds the CDK snapshot
 * tests, which take tens of seconds and mutate nothing pure, and `back-e2e`
 * needs a Postgres.
 *
 * This is a workspace file rather than settings on the config Stryker names,
 * because Vitest reads `vitest.workspace.ts` out of the directory holding the
 * config it was given and lets those projects win. Naming a workspace
 * explicitly is what stops that discovery. See
 * docs/dantotsus/a-mutation-config-a-workspace-file-overruled.md.
 */
export default defineWorkspace([
  {
    resolve: {
      alias: {
        '@site': fromHere('./site/src'),
        '@api': fromHere('./api/src'),
      },
    },
    test: {
      name: 'pure',
      environment: 'jsdom',
      include: [
        'api/src/**/*.core.test.ts',
        'api/src/**/*.utils.test.ts',
        'site/src/**/*.core.test.ts',
        'site/src/**/*.utils.test.ts',
      ],
    },
  },
]);
