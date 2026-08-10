/**
 * Local dev server. Run with `pnpm --filter @borso-app/last-loop-lepin run
 * dev:api`. Requires a local Postgres reachable via `DATABASE_URL` (the
 * testcontainers setup boots one on demand for the e2e gate; for ad-hoc
 * dev, point this at any local Postgres).
 */

import { serve } from '@hono/node-server';
import { createApp } from './app';

const DEFAULT_PORT = 3001;

/**
 * @Blueprint api-dev-entrypoint
 * @BlueprintName API Development Entrypoint
 * @BlueprintUsage Use for the local server of an API whose deployed form is a Lambda, so both start from the same composition root.
 * @BlueprintDescription Imports the same `createApp` the Lambda entrypoint uses and hands its `fetch` to a node server on a port the environment may override, so the only difference between running locally and running deployed is the adapter, not the routes.
 */
const port = Number(process.env.PORT ?? DEFAULT_PORT);
const app = createApp();

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`last-loop-lepin api listening on http://localhost:${info.port}`);
});
