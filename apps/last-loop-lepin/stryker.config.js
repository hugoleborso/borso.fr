import { defineStrykerConfig } from '../../stryker.shared.js';

export default defineStrykerConfig({
  mutate: [
    'api/src/**/*.core.ts',
    'api/src/**/*.utils.ts',
    'site/src/**/*.core.ts',
    'site/src/**/*.utils.ts',
  ],
  vitest: { configFile: 'vitest.mutation.config.ts' },
});
