import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromHere = (path: string) => fileURLToPath(new URL(path, import.meta.url));

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
