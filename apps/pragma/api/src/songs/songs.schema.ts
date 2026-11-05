import {
  CHORDPRO_TEXT_MAX_LENGTH,
  ENERGY_MAX,
  ENERGY_MIN,
  SONG_NOTE_MAX_LENGTH,
  SONG_TEXT_FIELD_MAX_LENGTH,
  SONG_TONALITY_MAX_LENGTH,
} from '@domain/input-limits.core';
import { integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { masteryScoreSchema } from '../mastery/mastery.schema';
import {
  detailInputShape,
  namedLineupSchema,
  pageInputShape,
  referenceSchema,
} from '../mcp/tool-input.schema';
import { normalizeLineup, type StoredLineupValue } from '@domain/lineup.core';
import { DEFAULT_SONG_ORIGIN, SONG_ORIGINS } from '@domain/song-origin.core';

export const SONG_STATUSES = ['idea', 'wip', 'rehearsed', 'concert_ready'] as const;
export const LINK_PROVIDERS = ['spotify', 'deezer', 'youtube', 'other'] as const;

// @FollowsBlueprint schema-table-and-input
export const songTable = pgTable(
  'song',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    artist: text('artist').notNull().default(''),
    status: text('status').notNull(),
    origin: text('origin'),
    links: text('links').notNull().default('[]'),
    chart: text('chart'),
    tonalityStart: text('tonality_start'),
    tonalityEnd: text('tonality_end'),
    defaultLineup: text('default_lineup').notNull().default('{}'),
    baseEnergy: integer('base_energy'),
    deezerTrackId: text('deezer_track_id'),
    deezerAlbumId: text('deezer_album_id'),
    spotifyTrackId: text('spotify_track_id'),
    album: text('album'),
    durationSeconds: integer('duration_seconds'),
    isrcs: text('isrcs'),
    tags: text('tags'),
    structureNotes: text('structure_notes'),
    gimmickNotes: text('gimmick_notes'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('song_deezer_track_id_unique').on(table.deezerTrackId)],
);

const LINK_COMMENT_MAX = 2_048;
const S3_KEY_MAX = 512;

export const songExternalLinkSchema = z.object({
  url: z.url(),
  provider: z.enum(LINK_PROVIDERS),
  comment: z.string().max(LINK_COMMENT_MAX).default(''),
});

export const chordChartSchema = z.union([
  z.object({ kind: z.literal('chordpro'), text: z.string().min(1).max(CHORDPRO_TEXT_MAX_LENGTH) }),
  z.object({ kind: z.literal('pdf'), s3Key: z.string().min(1).max(S3_KEY_MAX) }),
  z.object({ kind: z.literal('image'), s3Key: z.string().min(1).max(S3_KEY_MAX) }),
]);

const storedLineupValueSchema = z.union([z.array(z.guid()), z.guid(), z.null()]);

export const defaultLineupSchema = z
  .record(z.guid(), storedLineupValueSchema)
  .transform((stored: Record<string, StoredLineupValue>) => normalizeLineup(stored));

const SONG_ISRC_MAX = 32;
const SONG_ISRCS_MAX = 8;
const SONG_TAG_MAX = 64;
const SONG_TAGS_MAX = 16;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const SONG_DURATION_MAX_SECONDS = HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE;
const SONG_LINKS_MAX = 16;

const songFieldShape = {
  title: z.string().trim().min(1).max(SONG_TEXT_FIELD_MAX_LENGTH),
  artist: z.string().trim().max(SONG_TEXT_FIELD_MAX_LENGTH),
  status: z.enum(SONG_STATUSES),
  origin: z.enum(SONG_ORIGINS),
  links: z.array(songExternalLinkSchema).max(SONG_LINKS_MAX),
  chart: chordChartSchema.nullable(),
  tonalityStart: z.string().max(SONG_TONALITY_MAX_LENGTH).nullable(),
  tonalityEnd: z.string().max(SONG_TONALITY_MAX_LENGTH).nullable(),
  defaultLineup: defaultLineupSchema,
  baseEnergy: z.number().int().min(ENERGY_MIN).max(ENERGY_MAX).nullable(),
  deezerTrackId: z.string().max(SONG_TEXT_FIELD_MAX_LENGTH).nullable(),
  deezerAlbumId: z.string().max(SONG_TEXT_FIELD_MAX_LENGTH).nullable(),
  spotifyTrackId: z.string().max(SONG_TEXT_FIELD_MAX_LENGTH).nullable(),
  album: z.string().max(SONG_TEXT_FIELD_MAX_LENGTH).nullable(),
  durationSeconds: z.number().int().min(0).max(SONG_DURATION_MAX_SECONDS).nullable(),
  isrcs: z.array(z.string().max(SONG_ISRC_MAX)).max(SONG_ISRCS_MAX),
  tags: z.array(z.string().max(SONG_TAG_MAX)).max(SONG_TAGS_MAX),
  structureNotes: z.string().max(SONG_NOTE_MAX_LENGTH),
  gimmickNotes: z.string().max(SONG_NOTE_MAX_LENGTH),
  notes: z.string().max(SONG_NOTE_MAX_LENGTH),
};

const songBaseSchema = z.object({
  ...songFieldShape,
  artist: songFieldShape.artist.default(''),
  origin: songFieldShape.origin.default(DEFAULT_SONG_ORIGIN),
  links: songFieldShape.links.default([]),
  chart: songFieldShape.chart.default(null),
  tonalityStart: songFieldShape.tonalityStart.default(null),
  tonalityEnd: songFieldShape.tonalityEnd.default(null),
  defaultLineup: songFieldShape.defaultLineup.default({}),
  baseEnergy: songFieldShape.baseEnergy.default(null),
  deezerTrackId: songFieldShape.deezerTrackId.default(null),
  deezerAlbumId: songFieldShape.deezerAlbumId.default(null),
  spotifyTrackId: songFieldShape.spotifyTrackId.default(null),
  album: songFieldShape.album.default(null),
  durationSeconds: songFieldShape.durationSeconds.default(null),
  isrcs: songFieldShape.isrcs.default([]),
  tags: songFieldShape.tags.default([]),
  structureNotes: songFieldShape.structureNotes.default(''),
  gimmickNotes: songFieldShape.gimmickNotes.default(''),
  notes: songFieldShape.notes.default(''),
});

export const songCreateInputSchema = songBaseSchema;
export const songUpdateInputSchema = z.object(songFieldShape).partial();
export const songIdParamSchema = z.object({ id: z.guid() });
export const songReferenceToolInputSchema = z.object({ song: referenceSchema });
export const songReadToolInputSchema = songReferenceToolInputSchema.extend(detailInputShape);
export const songFindToolInputSchema = z.object({
  query: z.string().max(SONG_TEXT_FIELD_MAX_LENGTH).optional(),
  status: z.enum(SONG_STATUSES).optional(),
  ...pageInputShape,
});
export const songCreateFieldsSchema = songCreateInputSchema.omit({ defaultLineup: true });
export const songMasteryToolInputSchema = songReferenceToolInputSchema.extend({
  member: referenceSchema,
  instrument: referenceSchema,
  score: masteryScoreSchema.nullable(),
});
export const songSaveToolInputSchema = z
  .object({ song: referenceSchema.optional() })
  .extend(songUpdateInputSchema.omit({ defaultLineup: true }).shape)
  .extend({ defaultLineup: namedLineupSchema.optional() });
export const externalSearchQuerySchema = z.object({
  q: z.string().min(1).max(SONG_TEXT_FIELD_MAX_LENGTH),
});

export const songLinksRowSchema = z.array(songExternalLinkSchema);
export const songIsrcsRowSchema = z.array(z.string().max(SONG_ISRC_MAX));
export const songTagsRowSchema = z.array(z.string().max(SONG_TAG_MAX));
