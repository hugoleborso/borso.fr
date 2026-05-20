/**
 * Repository for the setlists bounded context.
 */

import { and, asc, eq } from 'drizzle-orm';
import type { Database } from '../database/client';
import { setlistEntryTable, setlistTable } from './setlists.schema';

export interface SetlistRow {
  id: string;
  sessionId: string;
}

export interface SetlistEntryRow {
  id: string;
  setlistId: string;
  songId: string;
  position: number;
  lineupOverride: unknown;
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
  lineupOverride: unknown;
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
  return await database
    .select(ENTRY_PROJECTION)
    .from(setlistEntryTable)
    .where(eq(setlistEntryTable.setlistId, setlistId))
    .orderBy(asc(setlistEntryTable.position));
}

export async function insertEntry(
  database: Database,
  values: EntryInsertShape,
): Promise<SetlistEntryRow> {
  const [row] = await database.insert(setlistEntryTable).values(values).returning(ENTRY_PROJECTION);
  if (row === undefined) throw new Error('insert returned no row');
  return row;
}

export async function updateEntry(
  database: Database,
  setlistId: string,
  entryId: string,
  updates: Record<string, unknown>,
): Promise<SetlistEntryRow | null> {
  const [row] = await database
    .update(setlistEntryTable)
    .set(updates)
    .where(and(eq(setlistEntryTable.id, entryId), eq(setlistEntryTable.setlistId, setlistId)))
    .returning(ENTRY_PROJECTION);
  return row ?? null;
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
