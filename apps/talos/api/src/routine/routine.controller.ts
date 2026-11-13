import { Hono } from 'hono';
import { requireSession } from '../auth/session.middleware';
import { listRoutineRuns } from './routine.service';

// @FollowsBlueprint controller-guarded-router
export function buildRoutineRouter() {
  return new Hono()
    .use('*', requireSession)
    .get('/runs', async (context) => context.json({ items: await listRoutineRuns() }));
}
