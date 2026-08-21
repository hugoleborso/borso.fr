import { defineStrykerConfig } from './stryker.shared.js';

export default defineStrykerConfig({
  mutate: ['scripts/**/*.core.ts', 'scripts/**/*.utils.ts'],
});
