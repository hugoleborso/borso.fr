import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromHere = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/**
 * Stryker's entry point: the pure suites and nothing else. The `core` project
 * of `vitest.config.ts` also holds the CDK snapshot tests, which take tens of
 * seconds and mutate nothing pure, and `back-e2e` needs a Postgres.
 *
 * Under Vitest 4 this is a single self-contained file. Vitest 3 and earlier
 * scanned the config's own directory for a `vitest.workspace.ts` and let that
 * file's projects override the `include` written here, which is why the
 * mutation gate on this app never reached a mutant; the workaround was a second
 * file naming the projects explicitly. Removing the workspace file removed the
 * scan, so the trap can no longer be expressed. See
 * docs/dantotsus/a-mutation-config-a-workspace-file-overruled.md.
 */
export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          alias: {
            '@site': fromHere('./site/src'),
            '@api': fromHere('./api/src'),
            '@domain': fromHere('./domain'),
          },
        },
        test: {
          name: 'pure',
          environment: 'jsdom',
          include: [
            'domain/**/*.core.test.ts',
            'api/src/**/*.core.test.ts',
            'api/src/**/*.utils.test.ts',
            'api/src/**/*.adapter.test.ts',
            'site/src/**/*.core.test.ts',
            'site/src/**/*.utils.test.ts',
            'site/src/**/*.adapter.test.ts',
          ],
        },
      },
    ],
  },
});
