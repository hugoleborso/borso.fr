/**
 * Drizzle schema for the songs (catalog) bounded context. The three
 * JSON blobs (`links`, `chart`, `default_lineup`) are stored as TEXT
 * because Aurora DSQL doesn't support `jsonb` (see
 * docs/knowledge/dsql-postgres-compat-gaps.md §1). The repository
 * JSON.stringifies at insert and JSON.parse + Zod-validates at read.
 * Zod schemas in this file double as runtime validators at both the
 * controller (input) and repository (row) boundaries.
 */

import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';

export const SONG_STATUSES = ['idea', 'wip', 'rehearsed', 'concert_ready'] as const;
export const LINK_PROVIDERS = ['spotify', 'deezer', 'youtube', 'other'] as const;
export const ENERGY_MIN = 1;
export const ENERGY_MAX = 10;

// @FollowsBlueprint schema-table-and-input
export const songTable = pgTable('song', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  artist: text('artist').notNull().default(''),
  status: text('status').notNull(),
  // Aurora DSQL doesn't support jsonb — see docs/knowledge/dsql-postgres-compat-gaps.md §1
  links: text('links').notNull().default('[]'),
  // Aurora DSQL doesn't support jsonb — see docs/knowledge/dsql-postgres-compat-gaps.md §1
  chart: text('chart'),
  tonalityStart: text('tonality_start'),
  tonalityEnd: text('tonality_end'),
  // Aurora DSQL doesn't support jsonb — see docs/knowledge/dsql-postgres-compat-gaps.md §1
  defaultLineup: text('default_lineup').notNull().default('{}'),
  // baseEnergy is the "what energy does this song carry on average"
  // hint; the per-entry energy on setlist_entry overrides it for the
  // sparkline.
  baseEnergy: integer('base_energy'),
  // MusicBrainz enrichment: stable foreign key + denormalised metadata.
  // Captured at pick-time; the user can override any of these. The
  // text-stringified JSON columns (`isrcs`, `tags`) carry no DB-side
  // NOT NULL / DEFAULT because DSQL §10 forbids those on ADD COLUMN;
  // the repository write-side defaults to `[]` on insert and the read
  // path narrows `null → []`.
  mbid: text('mbid'),
  album: text('album'),
  durationSeconds: integer('duration_seconds'),
  // Aurora DSQL doesn't support jsonb — see docs/knowledge/dsql-postgres-compat-gaps.md §1
  isrcs: text('isrcs'),
  // Aurora DSQL doesn't support jsonb — see docs/knowledge/dsql-postgres-compat-gaps.md §1
  tags: text('tags'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const songExternalLinkSchema = z.object({
  url: z.string().url(),
  provider: z.enum(LINK_PROVIDERS),
  comment: z.string().max(2_048).default(''),
});

export const chordChartSchema = z.union([
  z.object({ kind: z.literal('chordpro'), text: z.string().min(1).max(64_000) }),
  z.object({ kind: z.literal('pdf'), s3Key: z.string().min(1).max(512) }),
  z.object({ kind: z.literal('image'), s3Key: z.string().min(1).max(512) }),
]);

export const defaultLineupSchema = z.record(z.string().uuid(), z.string().uuid().nullable());

const SONG_STRING_FIELD_MAX = 256;
const SONG_ISRC_MAX = 32;
const SONG_ISRCS_MAX = 8;
const SONG_TAG_MAX = 64;
const SONG_TAGS_MAX = 16;
const SONG_DURATION_MAX_SECONDS = 24 * 60 * 60;

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
  mbid: z.string().max(SONG_STRING_FIELD_MAX).nullable().default(null),
  album: z.string().max(SONG_STRING_FIELD_MAX).nullable().default(null),
  durationSeconds: z.number().int().min(0).max(SONG_DURATION_MAX_SECONDS).nullable().default(null),
  isrcs: z.array(z.string().max(SONG_ISRC_MAX)).max(SONG_ISRCS_MAX).default([]),
  tags: z.array(z.string().max(SONG_TAG_MAX)).max(SONG_TAGS_MAX).default([]),
});

export const songCreateInputSchema = songBaseSchema;
export const songUpdateInputSchema = songBaseSchema.partial();
export const songIdParamSchema = z.object({ id: z.string().uuid() });
export const externalSearchQuerySchema = z.object({ q: z.string().min(1).max(256) });

// Row-side Zod schema for the `links` text column — wraps the array
// shape that the controller validates per-element. The repository uses
// this + the existing `chordChartSchema` + `defaultLineupSchema` to
// validate JSON blobs deserialised from text columns.
export const songLinksRowSchema = z.array(songExternalLinkSchema);
export const songIsrcsRowSchema = z.array(z.string().max(SONG_ISRC_MAX));
export const songTagsRowSchema = z.array(z.string().max(SONG_TAG_MAX));
