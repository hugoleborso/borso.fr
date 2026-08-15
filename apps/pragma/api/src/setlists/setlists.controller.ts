/**
 * Setlist endpoints. Hono routing + Zod parsing only.
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { requireSharedPasswordSession } from '../auth/shared-password.middleware';
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

// @FollowsBlueprint controller-dispatch
export function buildSetlistsRouter() {
  return new Hono()
    .use('*', requireSharedPasswordSession)
    .get(
      '/by-session/:sessionId',
      zValidator('param', setlistBySessionParamSchema),
      async (context) => {
        const { sessionId } = context.req.valid('param');
        const setlist = await getSetlistBySession(sessionId);
        if (setlist === null) return context.json({ error: 'not-found' }, 404);
        return context.json({ setlist });
      },
    )
    .post('/', zValidator('json', setlistCreateSchema), async (context) => {
      const { sessionId } = context.req.valid('json');
      const updated = await createSetlistForSession(sessionId);
      if (updated.kind === 'already-exists') return context.json({ error: 'already-exists' }, 409);
      return context.json({ setlist: updated.setlist }, 201);
    })
    .get('/:id/entries', zValidator('param', setlistIdParamSchema), async (context) => {
      const { id } = context.req.valid('param');
      const setlistEntries = await getEntries(id);
      return context.json({ entries: setlistEntries });
    })
    .post(
      '/:id/entries',
      zValidator('param', setlistIdParamSchema),
      zValidator('json', setlistEntryCreateSchema),
      async (context) => {
        const { id } = context.req.valid('param');
        const input = context.req.valid('json');
        const entry = await appendEntry(id, input);
        return context.json({ entry }, 201);
      },
    )
    .put(
      '/:id/entries/:entryId',
      zValidator('param', setlistEntryIdParamSchema),
      zValidator('json', setlistEntryUpdateSchema),
      async (context) => {
        const { id, entryId } = context.req.valid('param');
        const input = context.req.valid('json');
        const updated = await patchEntry(id, entryId, input);
        if (updated.kind === 'empty') return context.json({ error: 'empty-update' }, 400);
        if (updated.kind === 'not-found') return context.json({ error: 'not-found' }, 404);
        return context.json({ entry: updated.entry });
      },
    )
    .delete(
      '/:id/entries/:entryId',
      zValidator('param', setlistEntryIdParamSchema),
      async (context) => {
        const { id, entryId } = context.req.valid('param');
        const outcome = await removeEntryAndCompact(id, entryId);
        if (outcome === 'not-found') return context.json({ error: 'not-found' }, 404);
        return context.json({ id: entryId, deleted: true });
      },
    )
    .put(
      '/:id/reorder',
      zValidator('param', setlistIdParamSchema),
      zValidator('json', setlistReorderSchema),
      async (context) => {
        const { id } = context.req.valid('param');
        const { entryIds } = context.req.valid('json');
        const updated = await reorderEntries(id, entryIds);
        if (updated.kind === 'stale') return context.json({ error: 'reorder-stale' }, 409);
        return context.json({ id, entryIds });
      },
    );
}
