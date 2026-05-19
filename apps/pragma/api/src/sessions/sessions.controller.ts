/**
 * Sessions endpoints — single-table inheritance over `session.kind`.
 * Concert rows carry `venue`, `capacity`, `gear`, and
 * `friendsCountPerMember`; practice rows carry the optional
 * `preparedConcertId`. The Zod payload schemas pin which fields are
 * legal per kind; passing a practice-only key on a concert payload
 * (or vice versa) fails validation at the controller boundary.
 *
 * Routes:
 *  - GET    /api/sessions
 *  - GET    /api/sessions/:id
 *  - POST   /api/sessions
 *  - PUT    /api/sessions/:id
 *  - DELETE /api/sessions/:id   — cascades the setlist + entries.
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { getDatabase } from '../database/client';
import { sessionTable, setlistEntryTable, setlistTable } from '../database/schema';

const friendsCountSchema = z.record(z.string().uuid(), z.number().int().min(0).max(1_000));

const concertCreateSchema = z
  .object({
    kind: z.literal('concert'),
    date: z.string().datetime(),
    venue: z.string().trim().min(1).max(256),
    capacity: z.number().int().min(0).max(100_000),
    gear: z.string().max(2_048).default(''),
    friendsCountPerMember: friendsCountSchema.default({}),
  })
  .strict();

const practiceCreateSchema = z
  .object({
    kind: z.literal('practice'),
    date: z.string().datetime(),
    preparedConcertId: z.string().uuid().nullable().default(null),
  })
  .strict();

const sessionCreateSchema = z.discriminatedUnion('kind', [
  concertCreateSchema,
  practiceCreateSchema,
]);

const concertUpdateSchema = concertCreateSchema.partial().extend({ kind: z.literal('concert').optional() });
const practiceUpdateSchema = practiceCreateSchema.partial().extend({ kind: z.literal('practice').optional() });
const sessionUpdateSchema = z.union([concertUpdateSchema, practiceUpdateSchema]);

const idParamSchema = z.object({ id: z.string().uuid() });

const SESSION_PROJECTION = {
  id: sessionTable.id,
  kind: sessionTable.kind,
  date: sessionTable.date,
  preparedConcertId: sessionTable.preparedConcertId,
  venue: sessionTable.venue,
  capacity: sessionTable.capacity,
  gear: sessionTable.gear,
  friendsCountPerMember: sessionTable.friendsCountPerMember,
} as const;

export function buildSessionsRouter(): Hono {
  const router = new Hono();

  router.get('/', async (context) => {
    const database = getDatabase();
    const rows = await database
      .select(SESSION_PROJECTION)
      .from(sessionTable)
      .orderBy(desc(sessionTable.date));
    return context.json({ sessions: rows });
  });

  router.get('/:id', zValidator('param', idParamSchema), async (context) => {
    const database = getDatabase();
    const { id } = context.req.valid('param');
    const rows = await database
      .select(SESSION_PROJECTION)
      .from(sessionTable)
      .where(eq(sessionTable.id, id))
      .limit(1);
    const row = rows[0];
    if (row === undefined) return context.json({ error: 'not-found' }, 404);
    return context.json({ session: row });
  });

  router.post('/', zValidator('json', sessionCreateSchema), async (context) => {
    const database = getDatabase();
    const input = context.req.valid('json');
    const values =
      input.kind === 'concert'
        ? {
            kind: input.kind,
            date: new Date(input.date),
            venue: input.venue,
            capacity: input.capacity,
            gear: input.gear,
            friendsCountPerMember: input.friendsCountPerMember,
          }
        : {
            kind: input.kind,
            date: new Date(input.date),
            preparedConcertId: input.preparedConcertId,
          };
    const [row] = await database.insert(sessionTable).values(values).returning(SESSION_PROJECTION);
    return context.json({ session: row }, 201);
  });

  router.put(
    '/:id',
    zValidator('param', idParamSchema),
    zValidator('json', sessionUpdateSchema),
    async (context) => {
      const database = getDatabase();
      const { id } = context.req.valid('param');
      const input = context.req.valid('json');
      const updates: Record<string, unknown> = {};
      if (input.date !== undefined) updates.date = new Date(input.date);
      if ('venue' in input && input.venue !== undefined) updates.venue = input.venue;
      if ('capacity' in input && input.capacity !== undefined) updates.capacity = input.capacity;
      if ('gear' in input && input.gear !== undefined) updates.gear = input.gear;
      if ('friendsCountPerMember' in input && input.friendsCountPerMember !== undefined) {
        updates.friendsCountPerMember = input.friendsCountPerMember;
      }
      if ('preparedConcertId' in input && input.preparedConcertId !== undefined) {
        updates.preparedConcertId = input.preparedConcertId;
      }
      if (Object.keys(updates).length === 0) {
        return context.json({ error: 'empty-update' }, 400);
      }
      const [row] = await database
        .update(sessionTable)
        .set(updates)
        .where(eq(sessionTable.id, id))
        .returning(SESSION_PROJECTION);
      if (row === undefined) return context.json({ error: 'not-found' }, 404);
      return context.json({ session: row });
    },
  );

  router.delete('/:id', zValidator('param', idParamSchema), async (context) => {
    const database = getDatabase();
    const { id } = context.req.valid('param');
    // Cascade: delete dependent setlist entries first, then the
    // setlist itself, then the session.
    const setlists = await database
      .select({ id: setlistTable.id })
      .from(setlistTable)
      .where(eq(setlistTable.sessionId, id));
    if (setlists.length > 0) {
      const setlistIds = setlists.map((row) => row.id);
      await database
        .delete(setlistEntryTable)
        .where(inArray(setlistEntryTable.setlistId, setlistIds));
      await database.delete(setlistTable).where(eq(setlistTable.sessionId, id));
    }
    const deleted = await database
      .delete(sessionTable)
      .where(eq(sessionTable.id, id))
      .returning({ id: sessionTable.id });
    if (deleted.length === 0) return context.json({ error: 'not-found' }, 404);
    return context.json({ id, deleted: true });
  });

  return router;
}
