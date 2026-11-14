import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { requireOperatorSession } from '../auth/operator-session.middleware';
import { pullReviewEventsQuerySchema, pushReviewEventsSchema } from './review-events.schema';
import { readReviewEventsPage, storeReviewEvents } from './review-events.service';

export interface BuildReviewEventsRouterOptions {
  readonly clock?: () => Date;
}

// @FollowsBlueprint controller-guarded-router
export function buildReviewEventsRouter(options: BuildReviewEventsRouterOptions = {}) {
  const clock = options.clock ?? (() => new Date());
  return new Hono()
    .use('*', requireOperatorSession)
    .post('/', zValidator('json', pushReviewEventsSchema), async (context) => {
      const { events } = context.req.valid('json');
      const accepted = await storeReviewEvents({ events, now: clock() });
      return context.json({ accepted });
    })
    .get('/', zValidator('query', pullReviewEventsQuerySchema), async (context) => {
      const { after } = context.req.valid('query');
      return context.json(await readReviewEventsPage(after));
    });
}
