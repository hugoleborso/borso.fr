import { Hono } from 'hono';
import { requireSession } from '../auth/session.middleware';
import { pagePathValidator } from './pages.schema';
import { readPage } from './pages.service';

// @FollowsBlueprint controller-guarded-router
export function buildPagesRouter() {
  return new Hono()
    .use('*', requireSession)
    .get('/:path{.+}', pagePathValidator, async (context) =>
      context.json(await readPage(context.req.valid('param').path)),
    );
}
