/**
 * Local dev server. Run with `pnpm --filter @borso-app/pragma run
 * dev:api`. Requires a local Postgres reachable via `DATABASE_URL` —
 * the back-e2e suite boots a sandbox-owned cluster via
 * `scripts/local-postgres.sh`, the `pnpm dev` script reuses the same.
 */

import { serve } from '@hono/node-server';
import { createApp } from './app';

const DEFAULT_PORT = 3001;

const port = Number(process.env.PORT ?? DEFAULT_PORT);
const app = createApp();

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`pragma api listening on http://localhost:${info.port}`);
});
