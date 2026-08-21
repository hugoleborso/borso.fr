import { defineStrykerConfig } from '../../stryker.shared.js';

export default defineStrykerConfig({
  mutate: [
    'domain/**/*.core.ts',
    'api/src/**/*.core.ts',
    'api/src/**/*.utils.ts',
    'api/src/**/*.adapter.ts',
    'site/src/**/*.core.ts',
    'site/src/**/*.utils.ts',
    'site/src/**/*.adapter.ts',
  ],
  vitest: { configFile: 'vitest.mutation.config.ts' },
});
