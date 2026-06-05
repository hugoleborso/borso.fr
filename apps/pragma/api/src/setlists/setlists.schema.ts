/**
 * Drizzle schema for the setlists bounded context. A setlist belongs
 * to exactly one session; entries carry position, optional lineup
 * override, optional energy 1..10. `lineup_override` is stored as TEXT
 * (JSON-encoded) because Aurora DSQL doesn't support `jsonb` — see
 * docs/knowledge/dsql-postgres-compat-gaps.md §1.
 */

import { integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';

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
// TEXT — see docs/knowledge/dsql-postgres-compat-gaps.md §1).
export const lineupOverrideSchema = z.record(z.string().uuid(), z.string().uuid().nullable());

export const setlistEntryCreateSchema = z.object({
  songId: z.string().uuid(),
  energy: z.number().int().min(ENERGY_MIN).max(ENERGY_MAX).nullable().default(null),
  lineupOverride: lineupOverrideSchema.nullable().default(null),
  keyOverride: z.string().max(16).nullable().default(null),
  capo: z.number().int().min(CAPO_MIN).max(CAPO_MAX).nullable().default(null),
  notes: z.string().max(2_048).default(''),
});

export const setlistEntryUpdateSchema = setlistEntryCreateSchema.partial();

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
