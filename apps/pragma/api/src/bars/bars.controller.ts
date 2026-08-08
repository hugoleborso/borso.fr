/**
 * Bars CRM endpoints. Hono routing + Zod parsing; orchestration lives
 * in the service, DB access in the repository.
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { requireSharedPasswordSession } from '../auth/shared-password.middleware';
import { barCreateSchema, barIdParamSchema, barUpdateSchema } from './bars.schema';
import { createBar, getBarById, getBarsSortedByName, patchBar, removeBar } from './bars.service';

// @FollowsBlueprint controller-dispatch
export function buildBarsRouter() {
  return new Hono()
    .use('*', requireSharedPasswordSession)
    .get('/', async (context) => {
      const bars = await getBarsSortedByName();
      return context.json({ bars });
    })
    .get('/:id', zValidator('param', barIdParamSchema), async (context) => {
      const { id } = context.req.valid('param');
      const bar = await getBarById(id);
      if (bar === null) return context.json({ error: 'not-found' }, 404);
      return context.json({ bar });
    })
    .post('/', zValidator('json', barCreateSchema), async (context) => {
      const input = context.req.valid('json');
      const bar = await createBar(input);
      return context.json({ bar }, 201);
    })
    .put(
      '/:id',
      zValidator('param', barIdParamSchema),
      zValidator('json', barUpdateSchema),
      async (context) => {
        const { id } = context.req.valid('param');
        const input = context.req.valid('json');
        const result = await patchBar(id, input);
        if (result.kind === 'empty') return context.json({ error: 'empty-update' }, 400);
        if (result.kind === 'not-found') return context.json({ error: 'not-found' }, 404);
        return context.json({ bar: result.bar });
      },
    )
    .delete('/:id', zValidator('param', barIdParamSchema), async (context) => {
      const { id } = context.req.valid('param');
      const outcome = await removeBar(id);
      if (outcome === 'not-found') return context.json({ error: 'not-found' }, 404);
      return context.json({ id, deleted: true });
    });
}
