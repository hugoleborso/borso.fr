import { defineStrykerConfig } from '../../stryker.shared.js';

export default defineStrykerConfig({
  mutate: [
    'site/src/**/*.core.ts',
    'site/src/**/*.utils.ts',
    'site/src/**/*.adapter.ts',
    'domain/**/*.core.ts',
    'api/src/**/*.core.ts',
    'api/src/**/*.utils.ts',
    'api/src/**/*.adapter.ts',
    'scripts/**/*.core.ts',
    'scripts/**/*.adapter.ts',
  ],
  vitest: { configFile: 'vitest.mutation.config.ts' },
});
