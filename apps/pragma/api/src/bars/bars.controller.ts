/**
 * Bars CRM endpoints. Hono routing + Zod parsing; orchestration lives
 * in the service, DB access in the repository.
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { getDatabase } from '../database/client';
import {
  barCreateSchema,
  barIdParamSchema,
  barUpdateSchema,
} from './bars.schema';
import { createBar, getBarById, getBarsSortedByName, patchBar, removeBar } from './bars.service';

export function buildBarsRouter(): Hono {
  const router = new Hono();

  router.get('/', async (context) => {
    const bars = await getBarsSortedByName(getDatabase());
    return context.json({ bars });
  });

  router.get('/:id', zValidator('param', barIdParamSchema), async (context) => {
    const { id } = context.req.valid('param');
    const bar = await getBarById(getDatabase(), id);
    if (bar === null) return context.json({ error: 'not-found' }, 404);
    return context.json({ bar });
  });

  router.post('/', zValidator('json', barCreateSchema), async (context) => {
    const input = context.req.valid('json');
    const bar = await createBar(getDatabase(), input);
    return context.json({ bar }, 201);
  });

  router.put(
    '/:id',
    zValidator('param', barIdParamSchema),
    zValidator('json', barUpdateSchema),
    async (context) => {
      const { id } = context.req.valid('param');
      const input = context.req.valid('json');
      const result = await patchBar(getDatabase(), id, input);
      if (result.kind === 'empty') return context.json({ error: 'empty-update' }, 400);
      if (result.kind === 'not-found') return context.json({ error: 'not-found' }, 404);
      return context.json({ bar: result.bar });
    },
  );

  router.delete('/:id', zValidator('param', barIdParamSchema), async (context) => {
    const { id } = context.req.valid('param');
    const ok = await removeBar(getDatabase(), id);
    if (!ok) return context.json({ error: 'not-found' }, 404);
    return context.json({ id, deleted: true });
  });

  return router;
}
