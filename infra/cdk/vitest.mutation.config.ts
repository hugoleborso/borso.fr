import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.utils.test.ts'],
    environment: 'node',
    globals: false,
  },
});
