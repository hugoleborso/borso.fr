import { defineStrykerConfig } from '../../stryker.shared.js';

export default defineStrykerConfig({
  mutate: ['site/**/*.core.ts', 'site/**/*.utils.ts'],
});
