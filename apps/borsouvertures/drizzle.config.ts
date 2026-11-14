import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './api/src/database/schema.ts',
  out: './api/src/database/migrations',
  dialect: 'postgresql',
});
