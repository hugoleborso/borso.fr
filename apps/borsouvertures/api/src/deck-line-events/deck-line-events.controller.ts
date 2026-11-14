import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { requireOperatorSession } from '../auth/operator-session.middleware';
import { pullDeckLineEventsQuerySchema, pushDeckLineEventsSchema } from './deck-line-events.schema';
import { readDeckLineEventsPage, storeDeckLineEvents } from './deck-line-events.service';

export interface BuildDeckLineEventsRouterOptions {
  readonly clock?: () => Date;
}

// @FollowsBlueprint controller-guarded-router
export function buildDeckLineEventsRouter(options: BuildDeckLineEventsRouterOptions = {}) {
  const clock = options.clock ?? (() => new Date());
  return new Hono()
    .use('*', requireOperatorSession)
    .post('/', zValidator('json', pushDeckLineEventsSchema), async (context) => {
      const { events } = context.req.valid('json');
      const accepted = await storeDeckLineEvents({ events, now: clock() });
      return context.json({ accepted });
    })
    .get('/', zValidator('query', pullDeckLineEventsQuerySchema), async (context) => {
      const { after } = context.req.valid('query');
      return context.json(await readDeckLineEventsPage(after));
    });
}
