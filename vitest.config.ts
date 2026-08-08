import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['eslint-rules/**/*.test.js'],
    environment: 'node',
  },
});
