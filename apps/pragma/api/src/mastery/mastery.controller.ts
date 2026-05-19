/**
 * Mastery endpoints — the 5×7 default matrix lives at
 * `mastery_default`, the sparse per-song overrides at
 * `mastery_override`. Routes:
 *  - GET /api/mastery/defaults                  — every default row.
 *  - PUT /api/mastery/defaults                  — upsert one row
 *                                                  (memberId, instrumentId, score).
 *  - DELETE /api/mastery/defaults/:memberId/:instrumentId — clear one row.
 *  - GET /api/mastery/overrides/:songId         — every override row
 *                                                  for the song.
 *  - PUT /api/mastery/overrides                 — upsert one override
 *                                                  (memberId, instrumentId,
 *                                                   songId, score).
 *  - DELETE /api/mastery/overrides/:memberId/:instrumentId/:songId
 *                                                — clear one override.
 *
 * The controller deliberately stays CRUD-only on rows. The
 * `effective = override ?? default` resolution and aggregation live in
 * `domain/mastery.core.ts` and run on either side of the wire as needed.
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDatabase } from '../database/client';
import { masteryDefaultTable, masteryOverrideTable } from '../database/schema';

const SCORE_MIN = 0;
const SCORE_MAX = 10;

const scoreSchema = z.number().int().min(SCORE_MIN).max(SCORE_MAX);

const defaultRowSchema = z.object({
  memberId: z.string().uuid(),
  instrumentId: z.string().uuid(),
  score: scoreSchema,
});

const overrideRowSchema = z.object({
  memberId: z.string().uuid(),
  instrumentId: z.string().uuid(),
  songId: z.string().uuid(),
  score: scoreSchema,
});

const defaultPathSchema = z.object({
  memberId: z.string().uuid(),
  instrumentId: z.string().uuid(),
});

const overridePathSchema = defaultPathSchema.extend({ songId: z.string().uuid() });
const songIdParamSchema = z.object({ songId: z.string().uuid() });

export function buildMasteryRouter(): Hono {
  const router = new Hono();

  router.get('/defaults', async (context) => {
    const database = getDatabase();
    const rows = await database
      .select({
        memberId: masteryDefaultTable.memberId,
        instrumentId: masteryDefaultTable.instrumentId,
        score: masteryDefaultTable.score,
      })
      .from(masteryDefaultTable);
    return context.json({ defaults: rows });
  });

  router.put('/defaults', zValidator('json', defaultRowSchema), async (context) => {
    const database = getDatabase();
    const { memberId, instrumentId, score } = context.req.valid('json');
    await database
      .insert(masteryDefaultTable)
      .values({ memberId, instrumentId, score })
      .onConflictDoUpdate({
        target: [masteryDefaultTable.memberId, masteryDefaultTable.instrumentId],
        set: { score },
      });
    return context.json({ memberId, instrumentId, score });
  });

  router.delete(
    '/defaults/:memberId/:instrumentId',
    zValidator('param', defaultPathSchema),
    async (context) => {
      const database = getDatabase();
      const { memberId, instrumentId } = context.req.valid('param');
      const deleted = await database
        .delete(masteryDefaultTable)
        .where(
          and(
            eq(masteryDefaultTable.memberId, memberId),
            eq(masteryDefaultTable.instrumentId, instrumentId),
          ),
        )
        .returning({ memberId: masteryDefaultTable.memberId });
      if (deleted.length === 0) return context.json({ error: 'not-found' }, 404);
      return context.json({ memberId, instrumentId, deleted: true });
    },
  );

  router.get(
    '/overrides/:songId',
    zValidator('param', songIdParamSchema),
    async (context) => {
      const database = getDatabase();
      const { songId } = context.req.valid('param');
      const rows = await database
        .select({
          memberId: masteryOverrideTable.memberId,
          instrumentId: masteryOverrideTable.instrumentId,
          songId: masteryOverrideTable.songId,
          score: masteryOverrideTable.score,
        })
        .from(masteryOverrideTable)
        .where(eq(masteryOverrideTable.songId, songId));
      return context.json({ overrides: rows });
    },
  );

  router.put('/overrides', zValidator('json', overrideRowSchema), async (context) => {
    const database = getDatabase();
    const { memberId, instrumentId, songId, score } = context.req.valid('json');
    await database
      .insert(masteryOverrideTable)
      .values({ memberId, instrumentId, songId, score })
      .onConflictDoUpdate({
        target: [
          masteryOverrideTable.memberId,
          masteryOverrideTable.instrumentId,
          masteryOverrideTable.songId,
        ],
        set: { score },
      });
    return context.json({ memberId, instrumentId, songId, score });
  });

  router.delete(
    '/overrides/:memberId/:instrumentId/:songId',
    zValidator('param', overridePathSchema),
    async (context) => {
      const database = getDatabase();
      const { memberId, instrumentId, songId } = context.req.valid('param');
      const deleted = await database
        .delete(masteryOverrideTable)
        .where(
          and(
            eq(masteryOverrideTable.memberId, memberId),
            eq(masteryOverrideTable.instrumentId, instrumentId),
            eq(masteryOverrideTable.songId, songId),
          ),
        )
        .returning({ memberId: masteryOverrideTable.memberId });
      if (deleted.length === 0) return context.json({ error: 'not-found' }, 404);
      return context.json({ memberId, instrumentId, songId, deleted: true });
    },
  );

  return router;
}
