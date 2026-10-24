import { and, asc, eq, inArray } from 'drizzle-orm';
import type { z } from 'zod';
import { type DatabaseExecutor, getDatabase } from '../database/client';
import { type DeletionOutcome, selectDeletionOutcome } from '../helpers/persistence/deletion.core';
import {
  lineupOverrideSchema,
  type SetlistEntryPersistedUpdate,
  setlistEntryTable,
} from './setlists.schema';

export type LineupOverride = z.infer<typeof lineupOverrideSchema>;

type SetlistEntryRawRow = typeof setlistEntryTable.$inferSelect;

export type SetlistEntryRow = Omit<SetlistEntryRawRow, 'lineupOverride'> & {
  lineupOverride: LineupOverride | null;
};

export type EntryInsertShape = Omit<SetlistEntryRow, 'id'>;

// @FollowsBlueprint repository-projection
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

// @FollowsBlueprint repository-json-column
function rowToEntry(row: SetlistEntryRawRow): SetlistEntryRow {
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
    lineupOverride: values.lineupOverride === null ? null : JSON.stringify(values.lineupOverride),
    keyOverride: values.keyOverride,
    capo: values.capo,
    notes: values.notes,
  };
}

function encodeEntryUpdate(updates: SetlistEntryPersistedUpdate): EntryUpdateEncoded {
  const { lineupOverride, ...columns } = updates;
  if (lineupOverride === undefined) return columns;
  return {
    ...columns,
    lineupOverride: lineupOverride === null ? null : JSON.stringify(lineupOverride),
  };
}

export async function listEntryOwners(
  setlistIds: readonly string[],
): Promise<{ setlistId: string }[]> {
  if (setlistIds.length === 0) return [];
  const database = getDatabase();
  return await database
    .select({ setlistId: setlistEntryTable.setlistId })
    .from(setlistEntryTable)
    .where(inArray(setlistEntryTable.setlistId, [...setlistIds]));
}

export async function listEntries(setlistId: string): Promise<SetlistEntryRow[]> {
  const database = getDatabase();
  const rows = await database
    .select(ENTRY_PROJECTION)
    .from(setlistEntryTable)
    .where(eq(setlistEntryTable.setlistId, setlistId))
    .orderBy(asc(setlistEntryTable.position));
  return rows.map((row) => rowToEntry(row));
}

export async function listEntriesOfSong(songId: string): Promise<SetlistEntryRow[]> {
  const rows = await getDatabase()
    .select(ENTRY_PROJECTION)
    .from(setlistEntryTable)
    .where(eq(setlistEntryTable.songId, songId));
  return rows.map((row) => rowToEntry(row));
}

export async function listEntriesOfSetlists(
  setlistIds: readonly string[],
): Promise<SetlistEntryRow[]> {
  if (setlistIds.length === 0) return [];
  const rows = await getDatabase()
    .select(ENTRY_PROJECTION)
    .from(setlistEntryTable)
    .where(inArray(setlistEntryTable.setlistId, [...setlistIds]))
    .orderBy(asc(setlistEntryTable.position));
  return rows.map((row) => rowToEntry(row));
}

export async function updateEntry(
  setlistId: string,
  entryId: string,
  updates: SetlistEntryPersistedUpdate,
): Promise<SetlistEntryRow | null> {
  const database = getDatabase();
  const [row] = await database
    .update(setlistEntryTable)
    .set(encodeEntryUpdate(updates))
    .where(and(eq(setlistEntryTable.id, entryId), eq(setlistEntryTable.setlistId, setlistId)))
    .returning(ENTRY_PROJECTION);
  return row === undefined ? null : rowToEntry(row);
}

export async function deleteEntryWithin(
  executor: DatabaseExecutor,
  setlistId: string,
  entryId: string,
): Promise<DeletionOutcome> {
  const deleted = await executor
    .delete(setlistEntryTable)
    .where(and(eq(setlistEntryTable.id, entryId), eq(setlistEntryTable.setlistId, setlistId)))
    .returning({ id: setlistEntryTable.id });
  return selectDeletionOutcome(deleted.length);
}

export async function setEntryPositionWithin(
  executor: DatabaseExecutor,
  entryId: string,
  position: number,
): Promise<void> {
  await executor
    .update(setlistEntryTable)
    .set({ position })
    .where(eq(setlistEntryTable.id, entryId));
}

export async function listEntryIdsInOrderWithin(
  executor: DatabaseExecutor,
  setlistId: string,
): Promise<string[]> {
  const rows = await executor
    .select({ id: setlistEntryTable.id })
    .from(setlistEntryTable)
    .where(eq(setlistEntryTable.setlistId, setlistId))
    .orderBy(asc(setlistEntryTable.position));
  return rows.map((row) => row.id);
}

export async function insertEntryWithin(
  executor: DatabaseExecutor,
  values: EntryInsertShape,
): Promise<SetlistEntryRow> {
  const [row] = await executor
    .insert(setlistEntryTable)
    .values(encodeEntryInsert(values))
    .returning(ENTRY_PROJECTION);
  if (row === undefined) throw new Error('insert returned no row');
  return rowToEntry(row);
}

export async function countEntriesWithin(
  executor: DatabaseExecutor,
  setlistId: string,
): Promise<number> {
  const rows = await executor
    .select({ id: setlistEntryTable.id })
    .from(setlistEntryTable)
    .where(eq(setlistEntryTable.setlistId, setlistId));
  return rows.length;
}
