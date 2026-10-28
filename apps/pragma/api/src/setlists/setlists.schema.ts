import {
  MAX_POINTS_PER_SONG,
  SETLIST_STATUSES,
  TARGET_SONG_COUNT_MAX,
  TARGET_SONG_COUNT_MIN,
} from '@domain/setlist-vote.core';
import {
  CAPO_MAX,
  CAPO_MIN,
  ENERGY_MAX,
  ENERGY_MIN,
  KEY_OVERRIDE_MAX_LENGTH,
  SETLIST_ENTRY_NOTES_MAX_LENGTH,
  SETLIST_NAME_MAX_LENGTH,
} from '@domain/input-limits.core';
import { integer, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { namedLineupSchema, referenceSchema } from '../mcp/tool-input.schema';
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

export const lineupOverrideSchema = z
  .record(z.string().uuid(), z.union([z.array(z.string().uuid()), z.string().uuid(), z.null()]))
  .transform((stored: Record<string, StoredLineupValue>) => normalizeLineup(stored));

export const setlistEntryCreateSchema = z.object({
  songId: z.string().uuid(),
  energy: z.number().int().min(ENERGY_MIN).max(ENERGY_MAX).nullable().default(null),
  lineupOverride: lineupOverrideSchema.nullable().default(null),
  keyOverride: z.string().max(KEY_OVERRIDE_MAX_LENGTH).nullable().default(null),
  capo: z.number().int().min(CAPO_MIN).max(CAPO_MAX).nullable().default(null),
  notes: z.string().max(SETLIST_ENTRY_NOTES_MAX_LENGTH).default(''),
});

export const setlistEntryUpdateSchema = setlistEntryCreateSchema.partial();

export type SetlistEntryPersistedUpdate = z.infer<typeof setlistEntryUpdateSchema>;

export const setlistReorderSchema = z.object({
  entryIds: z.array(z.string().uuid()).min(1),
});

export const setlistCreateSchema = z.object({
  name: z.string().trim().max(SETLIST_NAME_MAX_LENGTH).default(''),
  sessionId: z.string().uuid().nullable().default(null),
});

export const setlistRenameSchema = z.object({
  name: z.string().trim().max(SETLIST_NAME_MAX_LENGTH),
});

export const setlistLinkSchema = z.object({ sessionId: z.string().uuid() });

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

const setlistReferenceShape = { setlist: referenceSchema };
const POSITION_MAX = 500;

export const setlistReferenceToolInputSchema = z.object(setlistReferenceShape);
export const setlistListToolInputSchema = z.object({ session: referenceSchema.optional() });
export const setlistSessionToolInputSchema = z.object({ session: referenceSchema });
export const setlistCreateToolInputSchema = z.object({
  name: setlistCreateSchema.shape.name,
  session: referenceSchema.optional(),
  songs: z.array(referenceSchema).optional(),
});
export const setlistRenameToolInputSchema = z
  .object(setlistReferenceShape)
  .merge(setlistRenameSchema);
export const setlistLinkToolInputSchema = z.object({
  ...setlistReferenceShape,
  session: referenceSchema,
  unlink: z.boolean().optional(),
});
export const setlistEntriesAddToolInputSchema = z.object({
  ...setlistReferenceShape,
  songs: z.array(referenceSchema).min(1),
});
export const setlistEntriesRemoveToolInputSchema = z.object({
  ...setlistReferenceShape,
  entries: z.array(referenceSchema).min(1),
});
export const setlistEntryChangeToolInputSchema = z
  .object({ ...setlistReferenceShape, entry: referenceSchema })
  .merge(setlistEntryUpdateSchema.omit({ songId: true, lineupOverride: true }))
  .extend({ lineupOverride: namedLineupSchema.nullable().optional() });
export const setlistReorderReferencesToolInputSchema = z.object({
  ...setlistReferenceShape,
  order: z.array(referenceSchema).min(1).optional(),
  move: z
    .object({ entry: referenceSchema, position: z.number().int().min(1).max(POSITION_MAX) })
    .optional(),
  swap: z.tuple([referenceSchema, referenceSchema]).optional(),
});
export const setlistVoteStatusReferenceToolInputSchema = z
  .object(setlistReferenceShape)
  .merge(setlistVoteStatusSchema);
export const setlistVoteCastToolInputSchema = z
  .object({ ...setlistReferenceShape, song: referenceSchema })
  .merge(setlistVoteScoreSchema);
export const setlistVoteCloseToolInputSchema = z.object({
  ...setlistReferenceShape,
  songs: z.array(referenceSchema).min(1),
});
