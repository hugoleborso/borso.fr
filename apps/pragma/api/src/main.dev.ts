import { serve } from '@hono/node-server';
import { createApp } from './app';

const DEFAULT_PORT = 3001;

const port = Number(process.env.PORT ?? DEFAULT_PORT);
// @FollowsBlueprint api-dev-entrypoint
const app = createApp();

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`pragma api listening on http://localhost:${info.port}`);
});
