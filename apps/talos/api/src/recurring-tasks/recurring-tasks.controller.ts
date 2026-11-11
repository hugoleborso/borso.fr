import { Hono } from 'hono';
import { requireSession } from '../auth/session.middleware';
import { readRecurringTasks } from './recurring-tasks.service';

// @FollowsBlueprint controller-guarded-router
export function buildRecurringTasksRouter() {
  return new Hono()
    .use('*', requireSession)
    .get('/', async (context) => context.json(await readRecurringTasks()));
}
