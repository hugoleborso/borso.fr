/**
 * Instruments admin endpoints. All routes are gated by the
 * shared-password session middleware applied at mount time in
 * `app.ts`. Hono routing only — orchestration lives in the service,
 * DB access in the repository.
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { requireSharedPasswordSession } from '../auth/shared-password.middleware';
import {
  createInstrumentSchema,
  instrumentIdParamSchema,
  updateInstrumentSchema,
} from './instruments.schema';
import {
  createInstrument,
  getInstrumentsSorted,
  patchInstrument,
  removeInstrument,
} from './instruments.service';

export function buildInstrumentsRouter() {
  return new Hono()
    .use('*', requireSharedPasswordSession)
    .get('/', async (context) => {
      const instruments = await getInstrumentsSorted();
      return context.json({ instruments });
    })
    .post('/', zValidator('json', createInstrumentSchema), async (context) => {
      const input = context.req.valid('json');
      const instrument = await createInstrument(input);
      return context.json({ instrument }, 201);
    })
    .put(
      '/:id',
      zValidator('param', instrumentIdParamSchema),
      zValidator('json', updateInstrumentSchema),
      async (context) => {
        const { id } = context.req.valid('param');
        const input = context.req.valid('json');
        const instrument = await patchInstrument(id, input);
        if (instrument === null) {
          const isOnlyEmpty = Object.keys(input).length === 0;
          if (isOnlyEmpty) return context.json({ error: 'empty-update' }, 400);
          return context.json({ error: 'not-found' }, 404);
        }
        return context.json({ instrument });
      },
    )
    .delete('/:id', zValidator('param', instrumentIdParamSchema), async (context) => {
      const { id } = context.req.valid('param');
      const outcome = await removeInstrument(id);
      if (outcome === 'not-found') return context.json({ error: 'not-found' }, 404);
      return context.json({ id, deleted: true });
    });
}
