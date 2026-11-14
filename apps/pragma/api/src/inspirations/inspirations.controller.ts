import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { readMemberId, requireMemberSession } from '../auth/member-session.middleware';
import {
  inspirationCreateSchema,
  inspirationPathSchema,
  inspirationUpdateSchema,
} from './inspirations.schema';
import {
  createInspiration,
  listInspirationViewsNewestFirst,
  removeInspiration,
  updateInspiration,
} from './inspirations.service';

const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;

function readNow(): Date {
  return new Date();
}

// @FollowsBlueprint controller-dispatch
export function buildInspirationsRouter() {
  return new Hono()
    .use('*', requireMemberSession)
    .get('/', async (context) => {
      const inspirations = await listInspirationViewsNewestFirst();
      return context.json({ inspirations });
    })
    .post('/', zValidator('json', inspirationCreateSchema), async (context) => {
      const inspiration = await createInspiration(context.req.valid('json'), {
        memberId: readMemberId(context),
        now: readNow(),
      });
      return context.json({ inspiration }, 201);
    })
    .patch(
      '/:id',
      zValidator('param', inspirationPathSchema),
      zValidator('json', inspirationUpdateSchema),
      async (context) => {
        const outcome = await updateInspiration(
          context.req.valid('param').id,
          context.req.valid('json'),
        );
        if (outcome.kind !== 'ok') return context.json({ error: outcome.kind }, NOT_FOUND_STATUS);
        return context.json({ inspiration: outcome.inspiration });
      },
    )
    .delete('/:id', zValidator('param', inspirationPathSchema), async (context) => {
      const { id } = context.req.valid('param');
      const outcome = await removeInspiration(id);
      if (outcome.kind === 'inspiration-not-found') {
        return context.json({ error: outcome.kind }, NOT_FOUND_STATUS);
      }
      if (outcome.kind === 'inspiration-in-use') {
        return context.json({ error: outcome.kind, sketches: outcome.sketches }, CONFLICT_STATUS);
      }
      return context.json({ id, deleted: true });
    });
}
