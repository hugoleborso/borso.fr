import { Hono } from 'hono';
import { requireSession } from '../auth/session.middleware';
import { readFreshness } from './freshness.service';

// @FollowsBlueprint controller-guarded-router
export function buildFreshnessRouter() {
  return new Hono()
    .use('*', requireSession)
    .get('/', async (context) => context.json(await readFreshness()));
}
