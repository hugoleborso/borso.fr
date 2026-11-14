import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { requireMemberSession } from '../auth/member-session.middleware';
import {
  compositionCreateSchema,
  compositionPathSchema,
  compositionRenameSchema,
} from './compositions.schema';
import {
  catalogueComposition,
  createComposition,
  listCompositions,
  removeComposition,
  renameComposition,
} from './compositions.service';

const NOT_FOUND_STATUS = 404;

function readNow(): Date {
  return new Date();
}

// @FollowsBlueprint controller-dispatch
export function buildCompositionsRouter() {
  return new Hono()
    .use('*', requireMemberSession)
    .get('/', async (context) => {
      const compositions = await listCompositions();
      return context.json({ compositions });
    })
    .post('/', zValidator('json', compositionCreateSchema), async (context) => {
      const composition = await createComposition(context.req.valid('json'), readNow());
      return context.json({ composition }, 201);
    })
    .patch(
      '/:id',
      zValidator('param', compositionPathSchema),
      zValidator('json', compositionRenameSchema),
      async (context) => {
        const outcome = await renameComposition(
          context.req.valid('param').id,
          context.req.valid('json'),
        );
        if (outcome.kind !== 'ok') return context.json({ error: outcome.kind }, NOT_FOUND_STATUS);
        return context.json({ composition: outcome.composition });
      },
    )
    .delete('/:id', zValidator('param', compositionPathSchema), async (context) => {
      const { id } = context.req.valid('param');
      const outcome = await removeComposition(id);
      if (outcome.kind !== 'deleted')
        return context.json({ error: outcome.kind }, NOT_FOUND_STATUS);
      return context.json({ id, deleted: true });
    })
    .post('/:id/catalogue', zValidator('param', compositionPathSchema), async (context) => {
      const outcome = await catalogueComposition(context.req.valid('param').id);
      if (outcome.kind !== 'ok') return context.json({ error: outcome.kind }, NOT_FOUND_STATUS);
      return context.json({ composition: outcome.composition });
    });
}
