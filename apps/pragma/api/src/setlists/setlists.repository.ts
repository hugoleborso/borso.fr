/**
 * Repository for the setlists bounded context.
 *
 * `lineup_override` is stored as TEXT (Aurora DSQL doesn't support
 * jsonb — see docs/knowledge/dsql-postgres-compat-gaps.md §1).
 * `rowToEntry` is the single parse-and-Zod-validate boundary; writes
 * JSON.stringify on the way in.
 */

import { and, asc, eq, inArray, max } from 'drizzle-orm';
import type { z } from 'zod';
import { type DatabaseExecutor, getDatabase } from '../database/client';
import { type DeletionOutcome, selectDeletionOutcome } from '../helpers/persistence/deletion.core';
import {
  selectNextLinkPosition,
  type SetlistSongCount,
  tallySongsPerSetlist,
} from './setlists.core';
import {
  lineupOverrideSchema,
  sessionSetlistTable,
  type SetlistEntryPersistedUpdate,
  setlistEntryTable,
  setlistTable,
} from './setlists.schema';

export type LineupOverride = z.infer<typeof lineupOverrideSchema>;

export type SetlistRow = typeof setlistTable.$inferSelect;

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

// @FollowsBlueprint repository-projection
const SETLIST_PROJECTION = {
  id: setlistTable.id,
  name: setlistTable.name,
} as const;

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

export async function listSetlists(): Promise<SetlistRow[]> {
  const database = getDatabase();
  return await database.select(SETLIST_PROJECTION).from(setlistTable).orderBy(asc(setlistTable.id));
}

export async function findSetlistById(setlistId: string): Promise<SetlistRow | null> {
  const database = getDatabase();
  const rows = await database
    .select(SETLIST_PROJECTION)
    .from(setlistTable)
    .where(eq(setlistTable.id, setlistId))
    .limit(1);
  return rows[0] ?? null;
}

export async function listSetlistsOfSession(sessionId: string): Promise<SetlistRow[]> {
  const database = getDatabase();
  return await database
    .select(SETLIST_PROJECTION)
    .from(sessionSetlistTable)
    .innerJoin(setlistTable, eq(setlistTable.id, sessionSetlistTable.setlistId))
    .where(eq(sessionSetlistTable.sessionId, sessionId))
    .orderBy(asc(sessionSetlistTable.position));
}

/**
 * Writes the setlist and, when a session is named, the link that puts it
 * at the end of that session's setlists — in one transaction, because
 * Aurora DSQL enforces no foreign key, so a link written without its
 * setlist, or a setlist that was meant to be attached and is not, would
 * survive forever.
 */
export async function insertSetlist(name: string, sessionId: string | null): Promise<SetlistRow> {
  const database = getDatabase();
  return await database.transaction(async (transaction) => {
    const [row] = await transaction
      .insert(setlistTable)
      .values({ name })
      .returning(SETLIST_PROJECTION);
    if (row === undefined) throw new Error('insert returned no row');
    if (sessionId !== null) await attachAtEnd(transaction, sessionId, row.id);
    return row;
  });
}

export async function insertSessionLink(sessionId: string, setlistId: string): Promise<void> {
  const database = getDatabase();
  await database.transaction(async (transaction) => {
    await attachAtEnd(transaction, sessionId, setlistId);
  });
}

async function attachAtEnd(
  executor: DatabaseExecutor,
  sessionId: string,
  setlistId: string,
): Promise<void> {
  const [row] = await executor
    .select({ highest: max(sessionSetlistTable.position) })
    .from(sessionSetlistTable)
    .where(eq(sessionSetlistTable.sessionId, sessionId));
  await executor
    .insert(sessionSetlistTable)
    .values({
      sessionId,
      setlistId,
      position: selectNextLinkPosition(row?.highest ?? null),
    })
    .onConflictDoNothing();
}

export async function updateSetlistName(
  setlistId: string,
  name: string,
): Promise<SetlistRow | null> {
  const database = getDatabase();
  const [row] = await database
    .update(setlistTable)
    .set({ name })
    .where(eq(setlistTable.id, setlistId))
    .returning(SETLIST_PROJECTION);
  return row ?? null;
}

export async function deleteSetlistWithEntries(setlistId: string): Promise<DeletionOutcome> {
  const database = getDatabase();
  return await database.transaction(async (transaction) => {
    await transaction.delete(setlistEntryTable).where(eq(setlistEntryTable.setlistId, setlistId));
    await transaction
      .delete(sessionSetlistTable)
      .where(eq(sessionSetlistTable.setlistId, setlistId));
    const deleted = await transaction
      .delete(setlistTable)
      .where(eq(setlistTable.id, setlistId))
      .returning({ id: setlistTable.id });
    return selectDeletionOutcome(deleted.length);
  });
}

export interface SetlistSessionLink {
  setlistId: string;
  sessionId: string;
}

export async function listAllSessionLinks(): Promise<SetlistSessionLink[]> {
  const database = getDatabase();
  return await database
    .select({
      setlistId: sessionSetlistTable.setlistId,
      sessionId: sessionSetlistTable.sessionId,
    })
    .from(sessionSetlistTable);
}

export async function deleteSessionLink(
  sessionId: string,
  setlistId: string,
): Promise<DeletionOutcome> {
  const database = getDatabase();
  const deleted = await database
    .delete(sessionSetlistTable)
    .where(
      and(
        eq(sessionSetlistTable.sessionId, sessionId),
        eq(sessionSetlistTable.setlistId, setlistId),
      ),
    )
    .returning({ setlistId: sessionSetlistTable.setlistId });
  return selectDeletionOutcome(deleted.length);
}

export async function countEntriesBySetlist(
  setlistIds: readonly string[],
): Promise<SetlistSongCount[]> {
  if (setlistIds.length === 0) return [];
  const database = getDatabase();
  const rows = await database
    .select({ setlistId: setlistEntryTable.setlistId })
    .from(setlistEntryTable)
    .where(inArray(setlistEntryTable.setlistId, [...setlistIds]));
  return tallySongsPerSetlist(setlistIds, rows);
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

export async function insertEntry(values: EntryInsertShape): Promise<SetlistEntryRow> {
  const database = getDatabase();
  const [row] = await database
    .insert(setlistEntryTable)
    .values(encodeEntryInsert(values))
    .returning(ENTRY_PROJECTION);
  if (row === undefined) throw new Error('insert returned no row');
  return rowToEntry(row);
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

export async function deleteEntry(setlistId: string, entryId: string): Promise<DeletionOutcome> {
  const database = getDatabase();
  const deleted = await database
    .delete(setlistEntryTable)
    .where(and(eq(setlistEntryTable.id, entryId), eq(setlistEntryTable.setlistId, setlistId)))
    .returning({ id: setlistEntryTable.id });
  return selectDeletionOutcome(deleted.length);
}

export async function setEntryPosition(entryId: string, position: number): Promise<void> {
  const database = getDatabase();
  await database
    .update(setlistEntryTable)
    .set({ position })
    .where(eq(setlistEntryTable.id, entryId));
}

export async function listEntryIds(setlistId: string): Promise<{ id: string }[]> {
  const database = getDatabase();
  return await database
    .select({ id: setlistEntryTable.id })
    .from(setlistEntryTable)
    .where(eq(setlistEntryTable.setlistId, setlistId));
}
