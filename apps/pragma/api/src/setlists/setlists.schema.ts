import { integer, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { normalizeLineup, type StoredLineupValue } from '@domain/lineup.core';

export const SETLIST_KINDS = ['manual', 'audience_choice'] as const;

export type SetlistKind = (typeof SETLIST_KINDS)[number];

export const DEFAULT_SETLIST_KIND: SetlistKind = 'manual';
export const AUDIENCE_CHOICE_SETLIST_KIND: SetlistKind = 'audience_choice';
export const AUDIENCE_CHOICE_SETLIST_NAME = 'Audience choice';

// @FollowsBlueprint schema-table-and-input
export const setlistTable = pgTable('setlist_sheet', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().default(''),
  kind: text('kind'),
  status: text('status'),
  targetSongCount: integer('target_song_count'),
});

export const setlistVoteTable = pgTable(
  'setlist_vote',
  {
    setlistId: uuid('setlist_id').notNull(),
    memberId: uuid('member_id').notNull(),
    songId: uuid('song_id').notNull(),
    points: integer('points').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.setlistId, table.memberId, table.songId] })],
);

export const sessionSetlistTable = pgTable(
  'session_setlist',
  {
    sessionId: uuid('session_id').notNull(),
    setlistId: uuid('setlist_id').notNull(),
    position: integer('position').notNull(),
  },
  (table) => [primaryKey({ columns: [table.sessionId, table.setlistId] })],
);

export const setlistEntryTable = pgTable('setlist_entry', {
  id: uuid('id').primaryKey().defaultRandom(),
  setlistId: uuid('setlist_id').notNull(),
  songId: uuid('song_id').notNull(),
  position: integer('position').notNull(),
  lineupOverride: text('lineup_override'),
  energy: integer('energy'),
  keyOverride: text('key_override'),
  capo: integer('capo'),
  notes: text('notes').notNull().default(''),
});

const ENERGY_MIN = 1;
const ENERGY_MAX = 10;
const CAPO_MIN = 0;
const CAPO_MAX = 11;
const NAME_MAX = 120;

export const lineupOverrideSchema = z
  .record(z.string().uuid(), z.union([z.array(z.string().uuid()), z.string().uuid(), z.null()]))
  .transform((stored: Record<string, StoredLineupValue>) => normalizeLineup(stored));

const KEY_OVERRIDE_MAX = 16;
const NOTES_MAX = 2_048;

export const setlistEntryCreateSchema = z.object({
  songId: z.string().uuid(),
  energy: z.number().int().min(ENERGY_MIN).max(ENERGY_MAX).nullable().default(null),
  lineupOverride: lineupOverrideSchema.nullable().default(null),
  keyOverride: z.string().max(KEY_OVERRIDE_MAX).nullable().default(null),
  capo: z.number().int().min(CAPO_MIN).max(CAPO_MAX).nullable().default(null),
  notes: z.string().max(NOTES_MAX).default(''),
});

export const setlistEntryUpdateSchema = setlistEntryCreateSchema.partial();

export type SetlistEntryPersistedUpdate = z.infer<typeof setlistEntryUpdateSchema>;

export const setlistReorderSchema = z.object({
  entryIds: z.array(z.string().uuid()).min(1),
});

export const setlistCreateSchema = z.object({
  name: z.string().trim().max(NAME_MAX).default(''),
  sessionId: z.string().uuid().nullable().default(null),
});

export const setlistRenameSchema = z.object({ name: z.string().trim().max(NAME_MAX) });

export const setlistLinkSchema = z.object({ sessionId: z.string().uuid() });

export const SETLIST_STATUSES = ['voting', 'locked'] as const;

export const TARGET_SONG_COUNT_MIN = 1;
export const TARGET_SONG_COUNT_MAX = 60;
export const MAX_POINTS_PER_SONG = 3;

export const setlistVoteStatusSchema = z.object({
  status: z.enum(SETLIST_STATUSES),
  targetSongCount: z
    .number()
    .int()
    .min(TARGET_SONG_COUNT_MIN)
    .max(TARGET_SONG_COUNT_MAX)
    .nullable()
    .default(null),
});

export const setlistVoteScoreSchema = z.object({
  points: z.number().int().min(0).max(MAX_POINTS_PER_SONG),
});

export const setlistCloseSchema = z.object({
  songIds: z.array(z.string().uuid()).min(1),
});

export const setlistSongParamSchema = z.object({
  id: z.string().uuid(),
  songId: z.string().uuid(),
});

export const setlistIdParamSchema = z.object({ id: z.string().uuid() });
export const setlistEntryIdParamSchema = z.object({
  id: z.string().uuid(),
  entryId: z.string().uuid(),
});
export const setlistSessionParamSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
});
export const setlistBySessionParamSchema = z.object({ sessionId: z.string().uuid() });
