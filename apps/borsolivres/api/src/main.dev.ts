/**
 * Local dev server. Run with `pnpm --filter @borso-app/borsolivres run dev:api`.
 * Needs a Postgres reachable through `DATABASE_URL`, which
 * `scripts/local-postgres.sh` provides without Docker.
 */

import { serve } from '@hono/node-server';
import { createApp } from './app';

const DEFAULT_PORT = 3002;

const port = Number(process.env.PORT ?? DEFAULT_PORT);
// @FollowsBlueprint api-dev-entrypoint
const app = createApp();

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`borsolivres api listening on http://localhost:${info.port}`);
});
