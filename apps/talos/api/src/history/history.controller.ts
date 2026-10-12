import { Hono } from 'hono';
import { requireSession } from '../auth/session.middleware';
import { briefDateValidator, reviewWeekValidator } from './history.schema';
import { readHistoryIndex, readPastBrief, readWeeklyReview } from './history.service';

// @FollowsBlueprint controller-guarded-router
export function buildHistoryRouter() {
  return new Hono()
    .use('*', requireSession)
    .get('/', async (context) => context.json(await readHistoryIndex()))
    .get('/briefs/:date', briefDateValidator, async (context) =>
      context.json(await readPastBrief(context.req.valid('param').date)),
    )
    .get('/reviews/:week', reviewWeekValidator, async (context) =>
      context.json(await readWeeklyReview(context.req.valid('param').week)),
    );
}
