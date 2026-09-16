import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { readMemberId, requireMemberSession } from '../auth/member-session.middleware';
import {
  improvementCreateSchema,
  improvementIdParamSchema,
  improvementUpdateSchema,
} from './improvements.schema';
import {
  castVote,
  createImprovement,
  getImprovementsRanked,
  patchImprovement,
  removeImprovement,
  withdrawVote,
} from './improvements.service';

// @FollowsBlueprint controller-dispatch
export function buildImprovementsRouter() {
  return new Hono()
    .use('*', requireMemberSession)
    .get('/', async (context) => {
      const improvements = await getImprovementsRanked(readMemberId(context));
      return context.json({ improvements });
    })
    .post('/', zValidator('json', improvementCreateSchema), async (context) => {
      const input = context.req.valid('json');
      const improvement = await createImprovement(input, readMemberId(context), new Date());
      return context.json({ improvement }, 201);
    })
    .put(
      '/:id',
      zValidator('param', improvementIdParamSchema),
      zValidator('json', improvementUpdateSchema),
      async (context) => {
        const { id } = context.req.valid('param');
        const input = context.req.valid('json');
        const updated = await patchImprovement(id, input, readMemberId(context));
        if (updated.kind === 'empty') return context.json({ error: 'empty-update' }, 400);
        if (updated.kind === 'not-found') return context.json({ error: 'not-found' }, 404);
        return context.json({ improvement: updated.improvement });
      },
    )
    .delete('/:id', zValidator('param', improvementIdParamSchema), async (context) => {
      const { id } = context.req.valid('param');
      const outcome = await removeImprovement(id);
      if (outcome === 'not-found') return context.json({ error: 'not-found' }, 404);
      return context.json({ id, deleted: true });
    })
    .put('/:id/vote', zValidator('param', improvementIdParamSchema), async (context) => {
      const { id } = context.req.valid('param');
      const improvement = await castVote(id, readMemberId(context), new Date());
      if (improvement === null) return context.json({ error: 'not-found' }, 404);
      return context.json({ improvement });
    })
    .delete('/:id/vote', zValidator('param', improvementIdParamSchema), async (context) => {
      const { id } = context.req.valid('param');
      const improvement = await withdrawVote(id, readMemberId(context));
      if (improvement === null) return context.json({ error: 'not-found' }, 404);
      return context.json({ improvement });
    });
}
