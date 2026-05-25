/**
 * Repository for the setlists bounded context.
 *
 * `lineup_override` is stored as TEXT (Aurora DSQL doesn't support
 * jsonb — see docs/knowledge/dsql-postgres-compat-gaps.md §1).
 * `rowToEntry` is the single parse-and-Zod-validate boundary; writes
 * JSON.stringify on the way in.
 */

import { and, asc, eq } from 'drizzle-orm';
import type { z } from 'zod';
import type { Database } from '../database/client';
import { lineupOverrideSchema, setlistEntryTable, setlistTable } from './setlists.schema';

export type LineupOverride = z.infer<typeof lineupOverrideSchema>;

export interface SetlistRow {
  id: string;
  sessionId: string;
}

export interface SetlistEntryRow {
  id: string;
  setlistId: string;
  songId: string;
  position: number;
  lineupOverride: LineupOverride | null;
  energy: number | null;
  keyOverride: string | null;
  capo: number | null;
  notes: string;
}

export interface EntryInsertShape {
  setlistId: string;
  songId: string;
  position: number;
  energy: number | null;
  lineupOverride: LineupOverride | null;
  keyOverride: string | null;
  capo: number | null;
  notes: string;
}

interface SetlistEntryRawRow {
  id: string;
  setlistId: string;
  songId: string;
  position: number;
  lineupOverride: string | null;
  energy: number | null;
  keyOverride: string | null;
  capo: number | null;
  notes: string;
}

const ENTRY_PROJECTION = {
  id: setlistEntryTable.id,
  setlistId: setlistEntryTable.setlistId,
  songId: setlistEntryTable.songId,
  position: setlistEntryTable.position,
  lineupOverride: setlistEntryTable.lineupOverride,
  energy: setlistEntryTable.energy,
  keyOverride: setlistEntryTable.keyOverride,
  capo: setlistEntryTable.capo,
  notes: setlistEntryTable.notes,
} as const;

function rowToEntry(row: SetlistEntryRawRow): SetlistEntryRow {
  // lineup_override is stored as JSON-encoded text. The `as unknown`
  // step is the JSON-parse escape hatch the repo allows; the row Zod
  // schema does the runtime validation.
  let lineupOverride: LineupOverride | null = null;
  if (row.lineupOverride !== null) {
    const lineupOverrideRaw: unknown = JSON.parse(row.lineupOverride);
    lineupOverride = lineupOverrideSchema.parse(lineupOverrideRaw);
  }
  return {
    id: row.id,
    setlistId: row.setlistId,
    songId: row.songId,
    position: row.position,
    lineupOverride,
    energy: row.energy,
    keyOverride: row.keyOverride,
    capo: row.capo,
    notes: row.notes,
  };
}

type EntryInsertEncoded = typeof setlistEntryTable.$inferInsert;
type EntryUpdateEncoded = Partial<EntryInsertEncoded>;

function encodeEntryInsert(values: EntryInsertShape): EntryInsertEncoded {
  return {
    setlistId: values.setlistId,
    songId: values.songId,
    position: values.position,
    energy: values.energy,
    lineupOverride:
      values.lineupOverride === null || values.lineupOverride === undefined
        ? null
        : JSON.stringify(values.lineupOverride),
    keyOverride: values.keyOverride,
    capo: values.capo,
    notes: values.notes,
  };
}

function encodeEntryUpdate(updates: Record<string, unknown>): EntryUpdateEncoded {
  const encoded: EntryUpdateEncoded = {};
  if ('songId' in updates && typeof updates.songId === 'string') encoded.songId = updates.songId;
  if ('position' in updates && typeof updates.position === 'number') encoded.position = updates.position;
  if ('energy' in updates) {
    const value = updates.energy;
    encoded.energy = value === null || typeof value === 'number' ? value : null;
  }
  if ('lineupOverride' in updates) {
    const value = updates.lineupOverride;
    encoded.lineupOverride = value === null || value === undefined ? null : JSON.stringify(value);
  }
  if ('keyOverride' in updates) {
    const value = updates.keyOverride;
    encoded.keyOverride = value === null || typeof value === 'string' ? value : null;
  }
  if ('capo' in updates) {
    const value = updates.capo;
    encoded.capo = value === null || typeof value === 'number' ? value : null;
  }
  if ('notes' in updates && typeof updates.notes === 'string') encoded.notes = updates.notes;
  return encoded;
}

export async function findSetlistBySession(
  database: Database,
  sessionId: string,
): Promise<SetlistRow | null> {
  const rows = await database
    .select({ id: setlistTable.id, sessionId: setlistTable.sessionId })
    .from(setlistTable)
    .where(eq(setlistTable.sessionId, sessionId))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertSetlist(database: Database, sessionId: string): Promise<SetlistRow> {
  const [row] = await database
    .insert(setlistTable)
    .values({ sessionId })
    .returning({ id: setlistTable.id, sessionId: setlistTable.sessionId });
  if (row === undefined) throw new Error('insert returned no row');
  return row;
}

export async function listEntries(
  database: Database,
  setlistId: string,
): Promise<SetlistEntryRow[]> {
  const rows = await database
    .select(ENTRY_PROJECTION)
    .from(setlistEntryTable)
    .where(eq(setlistEntryTable.setlistId, setlistId))
    .orderBy(asc(setlistEntryTable.position));
  return rows.map((row) => rowToEntry(row));
}

export async function insertEntry(
  database: Database,
  values: EntryInsertShape,
): Promise<SetlistEntryRow> {
  const [row] = await database
    .insert(setlistEntryTable)
    .values(encodeEntryInsert(values))
    .returning(ENTRY_PROJECTION);
  if (row === undefined) throw new Error('insert returned no row');
  return rowToEntry(row);
}

export async function updateEntry(
  database: Database,
  setlistId: string,
  entryId: string,
  updates: Record<string, unknown>,
): Promise<SetlistEntryRow | null> {
  const [row] = await database
    .update(setlistEntryTable)
    .set(encodeEntryUpdate(updates))
    .where(and(eq(setlistEntryTable.id, entryId), eq(setlistEntryTable.setlistId, setlistId)))
    .returning(ENTRY_PROJECTION);
  return row === undefined ? null : rowToEntry(row);
}

export async function deleteEntry(
  database: Database,
  setlistId: string,
  entryId: string,
): Promise<boolean> {
  const deleted = await database
    .delete(setlistEntryTable)
    .where(and(eq(setlistEntryTable.id, entryId), eq(setlistEntryTable.setlistId, setlistId)))
    .returning({ id: setlistEntryTable.id });
  return deleted.length > 0;
}

export async function setEntryPosition(
  database: Database,
  entryId: string,
  position: number,
): Promise<void> {
  await database
    .update(setlistEntryTable)
    .set({ position })
    .where(eq(setlistEntryTable.id, entryId));
}

export async function listEntryIds(
  database: Database,
  setlistId: string,
): Promise<{ id: string }[]> {
  return await database
    .select({ id: setlistEntryTable.id })
    .from(setlistEntryTable)
    .where(eq(setlistEntryTable.setlistId, setlistId));
}
