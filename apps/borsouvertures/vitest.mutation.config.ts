import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromHere = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// @FollowsBlueprint workspace-test-config
export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          alias: {
            '@': fromHere('./site/src'),
            '@api': fromHere('./api/src'),
            '@domain': fromHere('./domain'),
          },
        },
        test: {
          name: 'pure',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./site/src/test-setup.ts'],
          include: [
            'domain/**/*.core.test.ts',
            'api/src/**/*.core.test.ts',
            'api/src/**/*.utils.test.ts',
            'api/src/**/*.adapter.test.ts',
            'site/src/**/*.test.ts',
            'site/src/**/*.test.tsx',
            'scripts/**/*.test.ts',
          ],
          testTimeout: 30_000,
        },
      },
    ],
  },
});
