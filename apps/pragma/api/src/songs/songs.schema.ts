import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { normalizeLineup, type StoredLineupValue } from '@domain/lineup.core';

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
  links: text('links').notNull().default('[]'),
  chart: text('chart'),
  tonalityStart: text('tonality_start'),
  tonalityEnd: text('tonality_end'),
  defaultLineup: text('default_lineup').notNull().default('{}'),
  baseEnergy: integer('base_energy'),
  mbid: text('mbid'),
  album: text('album'),
  durationSeconds: integer('duration_seconds'),
  isrcs: text('isrcs'),
  tags: text('tags'),
  structureNotes: text('structure_notes'),
  gimmickNotes: text('gimmick_notes'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const externalSearchCacheTable = pgTable('external_search_cache', {
  normalizedQuery: text('normalized_query').primaryKey(),
  hits: text('hits').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
});

const LINK_COMMENT_MAX = 2_048;
const CHORDPRO_TEXT_MAX = 64_000;
const S3_KEY_MAX = 512;

export const songExternalLinkSchema = z.object({
  url: z.string().url(),
  provider: z.enum(LINK_PROVIDERS),
  comment: z.string().max(LINK_COMMENT_MAX).default(''),
});

export const chordChartSchema = z.union([
  z.object({ kind: z.literal('chordpro'), text: z.string().min(1).max(CHORDPRO_TEXT_MAX) }),
  z.object({ kind: z.literal('pdf'), s3Key: z.string().min(1).max(S3_KEY_MAX) }),
  z.object({ kind: z.literal('image'), s3Key: z.string().min(1).max(S3_KEY_MAX) }),
]);

const storedLineupValueSchema = z.union([z.array(z.string().uuid()), z.string().uuid(), z.null()]);

export const defaultLineupSchema = z
  .record(z.string().uuid(), storedLineupValueSchema)
  .transform((stored: Record<string, StoredLineupValue>) => normalizeLineup(stored));

const SONG_STRING_FIELD_MAX = 256;
const SONG_ISRC_MAX = 32;
const SONG_ISRCS_MAX = 8;
const SONG_TAG_MAX = 64;
const SONG_TAGS_MAX = 16;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const SONG_DURATION_MAX_SECONDS = HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE;
const SONG_LINKS_MAX = 16;
const SONG_TONALITY_MAX = 16;
const SONG_NOTE_MAX = 4_096;

const songBaseSchema = z.object({
  title: z.string().trim().min(1).max(SONG_STRING_FIELD_MAX),
  artist: z.string().trim().max(SONG_STRING_FIELD_MAX).default(''),
  status: z.enum(SONG_STATUSES),
  links: z.array(songExternalLinkSchema).max(SONG_LINKS_MAX).default([]),
  chart: chordChartSchema.nullable().default(null),
  tonalityStart: z.string().max(SONG_TONALITY_MAX).nullable().default(null),
  tonalityEnd: z.string().max(SONG_TONALITY_MAX).nullable().default(null),
  defaultLineup: defaultLineupSchema.default({}),
  baseEnergy: z.number().int().min(ENERGY_MIN).max(ENERGY_MAX).nullable().default(null),
  mbid: z.string().max(SONG_STRING_FIELD_MAX).nullable().default(null),
  album: z.string().max(SONG_STRING_FIELD_MAX).nullable().default(null),
  durationSeconds: z.number().int().min(0).max(SONG_DURATION_MAX_SECONDS).nullable().default(null),
  isrcs: z.array(z.string().max(SONG_ISRC_MAX)).max(SONG_ISRCS_MAX).default([]),
  tags: z.array(z.string().max(SONG_TAG_MAX)).max(SONG_TAGS_MAX).default([]),
  structureNotes: z.string().max(SONG_NOTE_MAX).default(''),
  gimmickNotes: z.string().max(SONG_NOTE_MAX).default(''),
  notes: z.string().max(SONG_NOTE_MAX).default(''),
});

export const songCreateInputSchema = songBaseSchema;
export const songUpdateInputSchema = songBaseSchema.partial();
export const songIdParamSchema = z.object({ id: z.string().uuid() });
export const externalSearchQuerySchema = z.object({
  q: z.string().min(1).max(SONG_STRING_FIELD_MAX),
});

export const songLinksRowSchema = z.array(songExternalLinkSchema);
export const songIsrcsRowSchema = z.array(z.string().max(SONG_ISRC_MAX));
export const songTagsRowSchema = z.array(z.string().max(SONG_TAG_MAX));
