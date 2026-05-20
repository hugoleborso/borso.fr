/**
 * Setlist endpoints. Hono routing + Zod parsing only.
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { getDatabase } from '../database/client';
import {
  setlistBySessionParamSchema,
  setlistCreateSchema,
  setlistEntryCreateSchema,
  setlistEntryIdParamSchema,
  setlistEntryUpdateSchema,
  setlistIdParamSchema,
  setlistReorderSchema,
} from './setlists.schema';
import {
  appendEntry,
  createSetlistForSession,
  getEntries,
  getSetlistBySession,
  patchEntry,
  removeEntryAndCompact,
  reorderEntries,
} from './setlists.service';

export function buildSetlistsRouter(): Hono {
  const router = new Hono();

  router.get(
    '/by-session/:sessionId',
    zValidator('param', setlistBySessionParamSchema),
    async (context) => {
      const { sessionId } = context.req.valid('param');
      const setlist = await getSetlistBySession(getDatabase(), sessionId);
      if (setlist === null) return context.json({ error: 'not-found' }, 404);
      return context.json({ setlist });
    },
  );

  router.post('/', zValidator('json', setlistCreateSchema), async (context) => {
    const { sessionId } = context.req.valid('json');
    const result = await createSetlistForSession(getDatabase(), sessionId);
    if (result.kind === 'already-exists') return context.json({ error: 'already-exists' }, 409);
    return context.json({ setlist: result.setlist }, 201);
  });

  router.get('/:id/entries', zValidator('param', setlistIdParamSchema), async (context) => {
    const { id } = context.req.valid('param');
    const entries = await getEntries(getDatabase(), id);
    return context.json({ entries });
  });

  router.post(
    '/:id/entries',
    zValidator('param', setlistIdParamSchema),
    zValidator('json', setlistEntryCreateSchema),
    async (context) => {
      const { id } = context.req.valid('param');
      const input = context.req.valid('json');
      const entry = await appendEntry(getDatabase(), id, input);
      return context.json({ entry }, 201);
    },
  );

  router.put(
    '/:id/entries/:entryId',
    zValidator('param', setlistEntryIdParamSchema),
    zValidator('json', setlistEntryUpdateSchema),
    async (context) => {
      const { id, entryId } = context.req.valid('param');
      const input = context.req.valid('json');
      const result = await patchEntry(getDatabase(), id, entryId, input);
      if (result.kind === 'empty') return context.json({ error: 'empty-update' }, 400);
      if (result.kind === 'not-found') return context.json({ error: 'not-found' }, 404);
      return context.json({ entry: result.entry });
    },
  );

  router.delete(
    '/:id/entries/:entryId',
    zValidator('param', setlistEntryIdParamSchema),
    async (context) => {
      const { id, entryId } = context.req.valid('param');
      const ok = await removeEntryAndCompact(getDatabase(), id, entryId);
      if (!ok) return context.json({ error: 'not-found' }, 404);
      return context.json({ id: entryId, deleted: true });
    },
  );

  router.put(
    '/:id/reorder',
    zValidator('param', setlistIdParamSchema),
    zValidator('json', setlistReorderSchema),
    async (context) => {
      const { id } = context.req.valid('param');
      const { entryIds } = context.req.valid('json');
      const result = await reorderEntries(getDatabase(), id, entryIds);
      if (result.kind === 'stale') return context.json({ error: 'reorder-stale' }, 409);
      return context.json({ id, entryIds });
    },
  );

  return router;
}
