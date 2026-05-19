/**
 * Catalog endpoints. Routes:
 *  - GET    /api/songs      — list songs, newest first.
 *  - GET    /api/songs/:id  — single-song detail.
 *  - POST   /api/songs      — create.
 *  - PUT    /api/songs/:id  — partial update.
 *  - DELETE /api/songs/:id  — delete; cascades the mastery_override and
 *                              setlist_entry rows manually since DSQL
 *                              does not enforce FK.
 *
 * The body payloads validate against `songCreateInputSchema` /
 * `songUpdateInputSchema`. JSONB columns (`links`, `chart`,
 * `defaultLineup`) are pinned with Zod schemas mirroring the spec
 * `Song` interface; anything that does not match is rejected at the
 * controller boundary.
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { getDatabase } from '../database/client';
import { masteryOverrideTable, setlistEntryTable, songTable } from '../database/schema';

const SONG_STATUSES = ['idea', 'wip', 'rehearsed', 'concert_ready'] as const;
const LINK_PROVIDERS = ['spotify', 'deezer', 'youtube', 'other'] as const;
const ENERGY_MIN = 1;
const ENERGY_MAX = 10;

const songExternalLinkSchema = z.object({
  url: z.string().url(),
  provider: z.enum(LINK_PROVIDERS),
  comment: z.string().max(2_048).default(''),
});

const chordChartSchema = z.union([
  z.object({ kind: z.literal('chordpro'), text: z.string().min(1).max(64_000) }),
  z.object({ kind: z.literal('pdf'), s3Key: z.string().min(1).max(512) }),
  z.object({ kind: z.literal('image'), s3Key: z.string().min(1).max(512) }),
]);

const defaultLineupSchema = z.record(z.string().uuid(), z.string().uuid().nullable());

const songBaseSchema = z.object({
  title: z.string().trim().min(1).max(256),
  artist: z.string().trim().max(256).default(''),
  status: z.enum(SONG_STATUSES),
  links: z.array(songExternalLinkSchema).max(16).default([]),
  chart: chordChartSchema.nullable().default(null),
  tonalityStart: z.string().max(16).nullable().default(null),
  tonalityEnd: z.string().max(16).nullable().default(null),
  defaultLineup: defaultLineupSchema.default({}),
  baseEnergy: z.number().int().min(ENERGY_MIN).max(ENERGY_MAX).nullable().default(null),
});

const songCreateInputSchema = songBaseSchema;
const songUpdateInputSchema = songBaseSchema.partial();

const idParamSchema = z.object({ id: z.string().uuid() });

interface SongDto {
  id: string;
  title: string;
  artist: string;
  status: string;
  links: unknown;
  chart: unknown;
  tonalityStart: string | null;
  tonalityEnd: string | null;
  defaultLineup: unknown;
  baseEnergy: number | null;
  createdAt: Date;
}

const SONG_PROJECTION = {
  id: songTable.id,
  title: songTable.title,
  artist: songTable.artist,
  status: songTable.status,
  links: songTable.links,
  chart: songTable.chart,
  tonalityStart: songTable.tonalityStart,
  tonalityEnd: songTable.tonalityEnd,
  defaultLineup: songTable.defaultLineup,
  baseEnergy: songTable.baseEnergy,
  createdAt: songTable.createdAt,
} as const;

export function buildSongsRouter(): Hono {
  const router = new Hono();

  router.get('/', async (context) => {
    const database = getDatabase();
    const rows: SongDto[] = await database
      .select(SONG_PROJECTION)
      .from(songTable)
      .orderBy(desc(songTable.createdAt));
    return context.json({ songs: rows });
  });

  router.get('/:id', zValidator('param', idParamSchema), async (context) => {
    const database = getDatabase();
    const { id } = context.req.valid('param');
    const rows: SongDto[] = await database
      .select(SONG_PROJECTION)
      .from(songTable)
      .where(eq(songTable.id, id))
      .limit(1);
    const row = rows[0];
    if (row === undefined) return context.json({ error: 'not-found' }, 404);
    return context.json({ song: row });
  });

  router.post('/', zValidator('json', songCreateInputSchema), async (context) => {
    const database = getDatabase();
    const input = context.req.valid('json');
    const [row] = await database
      .insert(songTable)
      .values({
        title: input.title,
        artist: input.artist,
        status: input.status,
        links: input.links,
        chart: input.chart,
        tonalityStart: input.tonalityStart,
        tonalityEnd: input.tonalityEnd,
        defaultLineup: input.defaultLineup,
        baseEnergy: input.baseEnergy,
      })
      .returning(SONG_PROJECTION);
    return context.json({ song: row }, 201);
  });

  router.put(
    '/:id',
    zValidator('param', idParamSchema),
    zValidator('json', songUpdateInputSchema),
    async (context) => {
      const database = getDatabase();
      const { id } = context.req.valid('param');
      const input = context.req.valid('json');
      if (Object.keys(input).length === 0) {
        return context.json({ error: 'empty-update' }, 400);
      }
      const [row] = await database
        .update(songTable)
        .set(input)
        .where(eq(songTable.id, id))
        .returning(SONG_PROJECTION);
      if (row === undefined) return context.json({ error: 'not-found' }, 404);
      return context.json({ song: row });
    },
  );

  router.delete('/:id', zValidator('param', idParamSchema), async (context) => {
    const database = getDatabase();
    const { id } = context.req.valid('param');
    // Manual cascade because DSQL ignores FK constraints — see
    // database/schema.ts header.
    await database.delete(masteryOverrideTable).where(eq(masteryOverrideTable.songId, id));
    await database.delete(setlistEntryTable).where(eq(setlistEntryTable.songId, id));
    const deleted = await database
      .delete(songTable)
      .where(eq(songTable.id, id))
      .returning({ id: songTable.id });
    if (deleted.length === 0) return context.json({ error: 'not-found' }, 404);
    return context.json({ id, deleted: true });
  });

  return router;
}
