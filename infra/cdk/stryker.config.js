import { defineStrykerConfig } from '../../stryker.shared.js';

export default defineStrykerConfig({
  mutate: ['src/**/*.utils.ts'],
  vitest: { configFile: 'vitest.mutation.config.ts' },
});
