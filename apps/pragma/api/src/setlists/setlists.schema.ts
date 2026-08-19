/**
 * Drizzle schema for the setlists bounded context. A setlist is a named
 * running order of songs that exists on its own; `session_setlist`
 * attaches it to any number of sessions, and a session carries any
 * number of setlists. Entries carry position, optional lineup
 * override, optional energy 1..10. `lineup_override` is stored as TEXT
 * (JSON-encoded) because Aurora DSQL doesn't support `jsonb` — see
 * docs/knowledge/dsql-postgres-compat-gaps.md §1.
 *
 * The physical table is `setlist_sheet` rather than `setlist` because
 * the original table declares `session_id` NOT NULL UNIQUE, and Aurora
 * DSQL accepts neither DROP COLUMN nor DROP CONSTRAINT (§10), so one
 * setlist per session cannot be relaxed in place. The rows moved to a
 * new table in `0003_setlists_across_sessions.sql`; `setlist` is left
 * behind and read by nothing.
 */

import { integer, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { normalizeLineup, type StoredLineupValue } from '@domain/lineup.core';

// @FollowsBlueprint schema-table-and-input
export const setlistTable = pgTable('setlist_sheet', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().default(''),
});

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
  // Aurora DSQL doesn't support jsonb — see docs/knowledge/dsql-postgres-compat-gaps.md §1
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

// Also used by the repository to validate the JSON blob deserialised
// from the `lineup_override` text column (Aurora DSQL stores it as
// TEXT — see docs/knowledge/dsql-postgres-compat-gaps.md §1). A value
// is a list of instrument ids; the single id and the null are the
// shapes written before one member could hold two instruments, and
// `normalizeLineup` lifts both into lists on read.
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

/**
 * An entry patch needs no reshaping between the request body and the row, so
 * the schema the controller validates against is also what the repository
 * writes, and this type is how it travels there.
 */
export type SetlistEntryPersistedUpdate = z.infer<typeof setlistEntryUpdateSchema>;

export const setlistReorderSchema = z.object({
  entryIds: z.array(z.string().uuid()).min(1),
});

/**
 * `sessionId` is optional because a setlist can be prepared before the
 * band knows which sessions will play it; when present the setlist is
 * attached to that session at creation, which is the one-tap path from
 * a session's own page.
 */
export const setlistCreateSchema = z.object({
  name: z.string().trim().max(NAME_MAX).default(''),
  sessionId: z.string().uuid().nullable().default(null),
});

export const setlistRenameSchema = z.object({ name: z.string().trim().max(NAME_MAX) });

export const setlistLinkSchema = z.object({ sessionId: z.string().uuid() });

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
