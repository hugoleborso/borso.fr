/**
 * Drizzle schema for the setlists bounded context. A setlist belongs
 * to exactly one session; entries carry position, optional lineup
 * override, optional energy 1..10. `lineup_override` is stored as TEXT
 * (JSON-encoded) because Aurora DSQL doesn't support `jsonb` — see
 * docs/knowledge/dsql-postgres-compat-gaps.md §1.
 */

import { integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { normalizeLineup, type StoredLineupValue } from '@domain/lineup.core';

// @FollowsBlueprint schema-table-and-input
export const setlistTable = pgTable('setlist', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().unique(),
});

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

export const setlistCreateSchema = z.object({ sessionId: z.string().uuid() });

export const setlistIdParamSchema = z.object({ id: z.string().uuid() });
export const setlistEntryIdParamSchema = z.object({
  id: z.string().uuid(),
  entryId: z.string().uuid(),
});
export const setlistBySessionParamSchema = z.object({ sessionId: z.string().uuid() });
