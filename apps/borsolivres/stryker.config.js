import { defineStrykerConfig } from '../../stryker.shared.js';

export default defineStrykerConfig({
  mutate: ['api/src/**/*.{core,utils,adapter}.ts', 'site/src/**/*.{core,utils,adapter}.ts'],
  vitest: { configFile: 'vitest.mutation.config.ts' },
});
