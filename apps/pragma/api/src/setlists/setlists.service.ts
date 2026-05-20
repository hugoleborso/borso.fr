/**
 * Service layer for setlists. Owns the position-compaction after
 * delete, the reorder validation (refuse stale client payloads), and
 * the "create setlist for a session" once-per-session guard.
 */

import type { Database } from '../database/client';
import {
  type SetlistEntryRow,
  type SetlistRow,
  deleteEntry,
  findSetlistBySession,
  insertEntry,
  insertSetlist,
  listEntries,
  listEntryIds,
  setEntryPosition,
  updateEntry,
} from './setlists.repository';
import type { setlistEntryCreateSchema } from './setlists.schema';
import type { z } from 'zod';

type EntryCreateInput = z.infer<typeof setlistEntryCreateSchema>;

export async function getSetlistBySession(
  database: Database,
  sessionId: string,
): Promise<SetlistRow | null> {
  return await findSetlistBySession(database, sessionId);
}

export async function createSetlistForSession(
  database: Database,
  sessionId: string,
): Promise<{ kind: 'ok'; setlist: SetlistRow } | { kind: 'already-exists' }> {
  const existing = await findSetlistBySession(database, sessionId);
  if (existing !== null) return { kind: 'already-exists' };
  const setlist = await insertSetlist(database, sessionId);
  return { kind: 'ok', setlist };
}

export async function getEntries(
  database: Database,
  setlistId: string,
): Promise<SetlistEntryRow[]> {
  return await listEntries(database, setlistId);
}

export async function appendEntry(
  database: Database,
  setlistId: string,
  input: EntryCreateInput,
): Promise<SetlistEntryRow> {
  const existing = await listEntries(database, setlistId);
  return await insertEntry(database, {
    setlistId,
    songId: input.songId,
    position: existing.length,
    energy: input.energy,
    lineupOverride: input.lineupOverride,
    keyOverride: input.keyOverride,
    capo: input.capo,
    notes: input.notes,
  });
}

export async function patchEntry(
  database: Database,
  setlistId: string,
  entryId: string,
  input: Partial<EntryCreateInput>,
): Promise<{ kind: 'ok'; entry: SetlistEntryRow } | { kind: 'empty' } | { kind: 'not-found' }> {
  if (Object.keys(input).length === 0) return { kind: 'empty' };
  const entry = await updateEntry(database, setlistId, entryId, input);
  if (entry === null) return { kind: 'not-found' };
  return { kind: 'ok', entry };
}

export async function removeEntryAndCompact(
  database: Database,
  setlistId: string,
  entryId: string,
): Promise<boolean> {
  const ok = await deleteEntry(database, setlistId, entryId);
  if (!ok) return false;
  // Compact positions so the next append lands at the right index.
  const remaining = await listEntries(database, setlistId);
  for (let position = 0; position < remaining.length; position += 1) {
    const entry = remaining[position];
    if (entry === undefined) continue;
    await setEntryPosition(database, entry.id, position);
  }
  return true;
}

export type ReorderResult = { kind: 'ok' } | { kind: 'stale' };

export async function reorderEntries(
  database: Database,
  setlistId: string,
  entryIds: readonly string[],
): Promise<ReorderResult> {
  const existing = await listEntryIds(database, setlistId);
  if (entryIds.length !== existing.length) return { kind: 'stale' };
  const existingIds = new Set(existing.map((row) => row.id));
  for (const entryId of entryIds) {
    if (!existingIds.has(entryId)) return { kind: 'stale' };
  }
  for (let position = 0; position < entryIds.length; position += 1) {
    const entryId = entryIds[position];
    if (entryId === undefined) continue;
    await setEntryPosition(database, entryId, position);
  }
  return { kind: 'ok' };
}
