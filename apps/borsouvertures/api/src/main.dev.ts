import { serve } from '@hono/node-server';
import { createApp } from './app';

const DEFAULT_PORT = 3005;

// @FollowsBlueprint api-dev-entrypoint
const port = Number(process.env.PORT ?? DEFAULT_PORT);
const app = createApp();

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`borsouvertures api listening on http://localhost:${info.port}`);
});
