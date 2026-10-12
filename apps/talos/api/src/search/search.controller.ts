import { Hono } from 'hono';
import { requireSession } from '../auth/session.middleware';
import { searchQueryValidator } from './search.schema';
import { searchPages } from './search.service';

// @FollowsBlueprint controller-guarded-router
export function buildSearchRouter() {
  return new Hono()
    .use('*', requireSession)
    .get('/', searchQueryValidator, async (context) =>
      context.json(await searchPages(context.req.valid('query').q)),
    );
}
