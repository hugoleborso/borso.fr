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
  setlistLinkSchema,
  setlistRenameSchema,
  setlistReorderSchema,
  setlistSessionParamSchema,
} from './setlists.schema';
import {
  appendEntry,
  createSetlist,
  getAllSetlists,
  getEntries,
  findSetlist,
  getSetlistsOfSession,
  linkSetlistToSession,
  patchEntry,
  removeEntryAndCompact,
  removeSetlist,
  renameSetlist,
  reorderEntries,
  unlinkSetlistFromSession,
} from './setlists.service';

// @FollowsBlueprint controller-dispatch
export function buildSetlistsRouter() {
  return new Hono()
    .use('*', requireSharedPasswordSession)
    .get('/', async (context) => {
      const setlists = await getAllSetlists();
      return context.json({ setlists });
    })
    .get(
      '/by-session/:sessionId',
      zValidator('param', setlistBySessionParamSchema),
      async (context) => {
        const { sessionId } = context.req.valid('param');
        const setlists = await getSetlistsOfSession(sessionId);
        return context.json({ setlists });
      },
    )
    .post('/', zValidator('json', setlistCreateSchema), async (context) => {
      const input = context.req.valid('json');
      const created = await createSetlist(input);
      if (created.kind === 'session-not-found')
        return context.json({ error: 'session-not-found' }, 404);
      return context.json({ setlist: created.setlist }, 201);
    })
    .get('/:id', zValidator('param', setlistIdParamSchema), async (context) => {
      const { id } = context.req.valid('param');
      const setlist = await findSetlist(id);
      if (setlist === null) return context.json({ error: 'not-found' }, 404);
      return context.json({ setlist });
    })
    .put(
      '/:id',
      zValidator('param', setlistIdParamSchema),
      zValidator('json', setlistRenameSchema),
      async (context) => {
        const { id } = context.req.valid('param');
        const { name } = context.req.valid('json');
        const setlist = await renameSetlist(id, name);
        if (setlist === null) return context.json({ error: 'not-found' }, 404);
        return context.json({ setlist });
      },
    )
    .delete('/:id', zValidator('param', setlistIdParamSchema), async (context) => {
      const { id } = context.req.valid('param');
      const outcome = await removeSetlist(id);
      if (outcome === 'not-found') return context.json({ error: 'not-found' }, 404);
      return context.json({ id, deleted: true });
    })
    .post(
      '/:id/sessions',
      zValidator('param', setlistIdParamSchema),
      zValidator('json', setlistLinkSchema),
      async (context) => {
        const { id } = context.req.valid('param');
        const { sessionId } = context.req.valid('json');
        const linked = await linkSetlistToSession(id, sessionId);
        if (linked.kind === 'not-found') return context.json({ error: 'not-found' }, 404);
        return context.json({ setlistId: id, sessionId }, 201);
      },
    )
    .delete(
      '/:id/sessions/:sessionId',
      zValidator('param', setlistSessionParamSchema),
      async (context) => {
        const { id, sessionId } = context.req.valid('param');
        const outcome = await unlinkSetlistFromSession(id, sessionId);
        if (outcome === 'not-found') return context.json({ error: 'not-found' }, 404);
        return context.json({ setlistId: id, sessionId, unlinked: true });
      },
    )
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
