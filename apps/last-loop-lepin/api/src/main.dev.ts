/**
 * Local dev server. Run with `pnpm --filter @borso-app/last-loop-lepin run
 * dev:api`. Requires a local Postgres reachable via `DATABASE_URL` (the
 * testcontainers setup boots one on demand for the e2e gate; for ad-hoc
 * dev, point this at any local Postgres).
 */

import { serve } from '@hono/node-server';
import { createApp } from './app';

const DEFAULT_PORT = 3001;

const port = Number(process.env.PORT ?? DEFAULT_PORT);
const app = createApp();

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`last-loop-lepin api listening on http://localhost:${info.port}`);
});
