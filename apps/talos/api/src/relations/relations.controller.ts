import { Hono } from 'hono';
import { requireSession } from '../auth/session.middleware';
import { readRelations } from './relations.service';

// @FollowsBlueprint controller-guarded-router
export function buildRelationsRouter() {
  return new Hono()
    .use('*', requireSession)
    .get('/', async (context) => context.json(await readRelations(new Date())));
}
