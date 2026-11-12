import { Hono } from 'hono';
import { requireSession } from '../auth/session.middleware';
import { routineMessageValidator } from './routine.schema';
import { launchMessageRun, listRoutineRuns } from './routine.service';

const CREATED_STATUS = 201;

// @FollowsBlueprint controller-guarded-router
export function buildRoutineRouter() {
  return new Hono()
    .use('*', requireSession)
    .get('/runs', async (context) => context.json({ items: await listRoutineRuns() }))
    .post('/runs', routineMessageValidator, async (context) => {
      const run = await launchMessageRun(context.req.valid('json').text, new Date());
      return context.json(run, CREATED_STATUS);
    });
}
