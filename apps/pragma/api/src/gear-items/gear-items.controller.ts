import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { requireMemberSession } from '../auth/member-session.middleware';
import {
  gearItemCopySchema,
  gearItemCreateSchema,
  gearItemParamSchema,
  gearItemUpdateSchema,
  gearSessionParamSchema,
} from './gear-items.schema';
import {
  copyGearItems,
  createGearItem,
  readGearChecklist,
  patchGearItem,
  removeGearItem,
} from './gear-items.service';

// @FollowsBlueprint controller-dispatch
export function buildGearItemsRouter() {
  return new Hono()
    .use('*', requireMemberSession)
    .get('/:sessionId', zValidator('param', gearSessionParamSchema), async (context) => {
      const outcome = await readGearChecklist(context.req.valid('param').sessionId);
      if (outcome.kind === 'not-a-concert') return context.json({ error: 'not-a-concert' }, 404);
      return context.json({ items: outcome.items, copySource: outcome.copySource });
    })
    .post(
      '/:sessionId/copy',
      zValidator('param', gearSessionParamSchema),
      zValidator('json', gearItemCopySchema),
      async (context) => {
        const outcome = await copyGearItems(
          context.req.valid('param').sessionId,
          context.req.valid('json').fromSessionId,
        );
        if (outcome.kind === 'not-a-concert') return context.json({ error: 'not-a-concert' }, 404);
        if (outcome.kind === 'gear-not-empty')
          return context.json({ error: 'gear-not-empty' }, 409);
        return context.json({ items: outcome.items }, 201);
      },
    )
    .post(
      '/:sessionId',
      zValidator('param', gearSessionParamSchema),
      zValidator('json', gearItemCreateSchema),
      async (context) => {
        const outcome = await createGearItem(
          context.req.valid('param').sessionId,
          context.req.valid('json'),
        );
        if (outcome.kind === 'not-a-concert') return context.json({ error: 'not-a-concert' }, 404);
        if (outcome.kind === 'holding-invalid')
          return context.json({ error: 'holding-invalid' }, 400);
        if (outcome.kind === 'member-not-found')
          return context.json({ error: 'member-not-found' }, 400);
        if (outcome.kind === 'id-taken') return context.json({ error: 'id-taken' }, 409);
        return context.json({ item: outcome.item }, 201);
      },
    )
    .put(
      '/:sessionId/:id',
      zValidator('param', gearItemParamSchema),
      zValidator('json', gearItemUpdateSchema),
      async (context) => {
        const { sessionId, id } = context.req.valid('param');
        const outcome = await patchGearItem(sessionId, id, context.req.valid('json'));
        if (outcome.kind === 'empty') return context.json({ error: 'empty-update' }, 400);
        if (outcome.kind === 'holding-invalid')
          return context.json({ error: 'holding-invalid' }, 400);
        if (outcome.kind === 'member-not-found')
          return context.json({ error: 'member-not-found' }, 400);
        if (outcome.kind === 'not-found') return context.json({ error: 'not-found' }, 404);
        return context.json({ item: outcome.item });
      },
    )
    .delete('/:sessionId/:id', zValidator('param', gearItemParamSchema), async (context) => {
      const { sessionId, id } = context.req.valid('param');
      const outcome = await removeGearItem(sessionId, id);
      if (outcome === 'not-found') return context.json({ error: 'not-found' }, 404);
      return context.json({ id, deleted: true });
    });
}
