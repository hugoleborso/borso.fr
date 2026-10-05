import { Hono } from 'hono';
import { requireSession } from '../auth/session.middleware';
import { readToday } from './today.service';

// @FollowsBlueprint controller-guarded-router
export function buildTodayRouter() {
  return new Hono()
    .use('*', requireSession)
    .get('/', async (context) => context.json(await readToday(new Date())));
}
