import { Hono } from 'hono';
import { requireSession } from '../auth/session.middleware';
import { graphQueryValidator } from './graph.schema';
import { readGraph } from './graph.service';

// @FollowsBlueprint controller-guarded-router
export function buildGraphRouter() {
  return new Hono()
    .use('*', requireSession)
    .get('/', graphQueryValidator, async (context) =>
      context.json(await readGraph(context.req.valid('query').date)),
    );
}
