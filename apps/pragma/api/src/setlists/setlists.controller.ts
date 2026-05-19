/**
 * Setlist endpoints. A setlist is 1..1 with a session (`setlist.session_id`
 * is unique). Entries are reorderable via the `PUT /reorder` endpoint
 * that ships the full ordered array of entry IDs in one request — keeps
 * the reorder atomic per the last-write-wins concurrency story.
 *
 * Routes:
 *  - GET  /api/setlists/by-session/:sessionId           — read or 404.
 *  - POST /api/setlists                                  — create the
 *                                                          (empty) setlist
 *                                                          for a session.
 *  - GET  /api/setlists/:id/entries                      — list entries
 *                                                          in position order.
 *  - POST /api/setlists/:id/entries                      — append an entry.
 *  - PUT  /api/setlists/:id/entries/:entryId             — partial update.
 *  - DELETE /api/setlists/:id/entries/:entryId           — remove + compact
 *                                                          positions.
 *  - PUT  /api/setlists/:id/reorder                      — reorder.
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDatabase } from '../database/client';
import { setlistEntryTable, setlistTable } from '../database/schema';

const ENERGY_MIN = 1;
const ENERGY_MAX = 10;
const CAPO_MIN = 0;
const CAPO_MAX = 11;

const lineupOverrideSchema = z.record(z.string().uuid(), z.string().uuid().nullable());

const entryCreateSchema = z.object({
  songId: z.string().uuid(),
  energy: z.number().int().min(ENERGY_MIN).max(ENERGY_MAX).nullable().default(null),
  lineupOverride: lineupOverrideSchema.nullable().default(null),
  keyOverride: z.string().max(16).nullable().default(null),
  capo: z.number().int().min(CAPO_MIN).max(CAPO_MAX).nullable().default(null),
  notes: z.string().max(2_048).default(''),
});

const entryUpdateSchema = entryCreateSchema.partial();

const reorderSchema = z.object({
  entryIds: z.array(z.string().uuid()).min(1),
});

const setlistCreateSchema = z.object({ sessionId: z.string().uuid() });
const setlistIdParam = z.object({ id: z.string().uuid() });
const entryPathSchema = z.object({ id: z.string().uuid(), entryId: z.string().uuid() });
const bySessionParamSchema = z.object({ sessionId: z.string().uuid() });

const ENTRY_PROJECTION = {
  id: setlistEntryTable.id,
  setlistId: setlistEntryTable.setlistId,
  songId: setlistEntryTable.songId,
  position: setlistEntryTable.position,
  lineupOverride: setlistEntryTable.lineupOverride,
  energy: setlistEntryTable.energy,
  keyOverride: setlistEntryTable.keyOverride,
  capo: setlistEntryTable.capo,
  notes: setlistEntryTable.notes,
} as const;

export function buildSetlistsRouter(): Hono {
  const router = new Hono();

  router.get(
    '/by-session/:sessionId',
    zValidator('param', bySessionParamSchema),
    async (context) => {
      const database = getDatabase();
      const { sessionId } = context.req.valid('param');
      const rows = await database
        .select({ id: setlistTable.id, sessionId: setlistTable.sessionId })
        .from(setlistTable)
        .where(eq(setlistTable.sessionId, sessionId))
        .limit(1);
      const row = rows[0];
      if (row === undefined) return context.json({ error: 'not-found' }, 404);
      return context.json({ setlist: row });
    },
  );

  router.post('/', zValidator('json', setlistCreateSchema), async (context) => {
    const database = getDatabase();
    const { sessionId } = context.req.valid('json');
    const existing = await database
      .select({ id: setlistTable.id })
      .from(setlistTable)
      .where(eq(setlistTable.sessionId, sessionId))
      .limit(1);
    if (existing.length > 0) return context.json({ error: 'already-exists' }, 409);
    const [row] = await database
      .insert(setlistTable)
      .values({ sessionId })
      .returning({ id: setlistTable.id, sessionId: setlistTable.sessionId });
    return context.json({ setlist: row }, 201);
  });

  router.get('/:id/entries', zValidator('param', setlistIdParam), async (context) => {
    const database = getDatabase();
    const { id } = context.req.valid('param');
    const rows = await database
      .select(ENTRY_PROJECTION)
      .from(setlistEntryTable)
      .where(eq(setlistEntryTable.setlistId, id))
      .orderBy(asc(setlistEntryTable.position));
    return context.json({ entries: rows });
  });

  router.post(
    '/:id/entries',
    zValidator('param', setlistIdParam),
    zValidator('json', entryCreateSchema),
    async (context) => {
      const database = getDatabase();
      const { id } = context.req.valid('param');
      const input = context.req.valid('json');
      const existing = await database
        .select({ position: setlistEntryTable.position })
        .from(setlistEntryTable)
        .where(eq(setlistEntryTable.setlistId, id))
        .orderBy(asc(setlistEntryTable.position));
      const nextPosition = existing.length;
      const [row] = await database
        .insert(setlistEntryTable)
        .values({
          setlistId: id,
          songId: input.songId,
          position: nextPosition,
          energy: input.energy,
          lineupOverride: input.lineupOverride,
          keyOverride: input.keyOverride,
          capo: input.capo,
          notes: input.notes,
        })
        .returning(ENTRY_PROJECTION);
      return context.json({ entry: row }, 201);
    },
  );

  router.put(
    '/:id/entries/:entryId',
    zValidator('param', entryPathSchema),
    zValidator('json', entryUpdateSchema),
    async (context) => {
      const database = getDatabase();
      const { id, entryId } = context.req.valid('param');
      const input = context.req.valid('json');
      if (Object.keys(input).length === 0) {
        return context.json({ error: 'empty-update' }, 400);
      }
      const [row] = await database
        .update(setlistEntryTable)
        .set(input)
        .where(
          and(eq(setlistEntryTable.id, entryId), eq(setlistEntryTable.setlistId, id)),
        )
        .returning(ENTRY_PROJECTION);
      if (row === undefined) return context.json({ error: 'not-found' }, 404);
      return context.json({ entry: row });
    },
  );

  router.delete(
    '/:id/entries/:entryId',
    zValidator('param', entryPathSchema),
    async (context) => {
      const database = getDatabase();
      const { id, entryId } = context.req.valid('param');
      const deleted = await database
        .delete(setlistEntryTable)
        .where(
          and(eq(setlistEntryTable.id, entryId), eq(setlistEntryTable.setlistId, id)),
        )
        .returning({ id: setlistEntryTable.id });
      if (deleted.length === 0) return context.json({ error: 'not-found' }, 404);
      // Compact positions after a delete so the next append lands at
      // the correct index.
      const remaining = await database
        .select({ id: setlistEntryTable.id })
        .from(setlistEntryTable)
        .where(eq(setlistEntryTable.setlistId, id))
        .orderBy(asc(setlistEntryTable.position));
      for (let position = 0; position < remaining.length; position += 1) {
        const entry = remaining[position];
        if (entry === undefined) continue;
        await database
          .update(setlistEntryTable)
          .set({ position })
          .where(eq(setlistEntryTable.id, entry.id));
      }
      return context.json({ id: entryId, deleted: true });
    },
  );

  router.put(
    '/:id/reorder',
    zValidator('param', setlistIdParam),
    zValidator('json', reorderSchema),
    async (context) => {
      const database = getDatabase();
      const { id } = context.req.valid('param');
      const { entryIds } = context.req.valid('json');
      const existing = await database
        .select({ id: setlistEntryTable.id })
        .from(setlistEntryTable)
        .where(eq(setlistEntryTable.setlistId, id));
      const existingIds = new Set(existing.map((row) => row.id));
      // Refuse the call if the client shipped an id that does not belong
      // to this setlist OR if any current entry is missing from the
      // reorder payload — both indicate stale client state and we'd
      // rather 409 than silently lose data.
      if (entryIds.length !== existing.length) {
        return context.json({ error: 'reorder-stale' }, 409);
      }
      for (const entryId of entryIds) {
        if (!existingIds.has(entryId)) {
          return context.json({ error: 'reorder-stale' }, 409);
        }
      }
      for (let position = 0; position < entryIds.length; position += 1) {
        const entryId = entryIds[position];
        if (entryId === undefined) continue;
        await database
          .update(setlistEntryTable)
          .set({ position })
          .where(eq(setlistEntryTable.id, entryId));
      }
      return context.json({ id, entryIds });
    },
  );

  return router;
}
