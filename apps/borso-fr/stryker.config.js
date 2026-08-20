import { defineStrykerConfig } from '../../stryker.shared.js';

export default defineStrykerConfig({
  mutate: ['site/src/**/*.core.ts', 'site/src/**/*.utils.ts', 'site/src/**/*.adapter.ts'],
});
