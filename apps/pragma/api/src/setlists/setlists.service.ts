/**
 * Service layer for setlists. Owns the position-compaction after
 * delete, the reorder validation (refuse stale client payloads), and
 * the "create setlist for a session" once-per-session guard.
 */

import type { z } from 'zod';
import type { DeletionOutcome } from '../helpers/persistence/deletion.core';
import {
  deleteEntry,
  findSetlistBySession,
  insertEntry,
  insertSetlist,
  listEntries,
  listEntryIds,
  type SetlistEntryRow,
  type SetlistRow,
  setEntryPosition,
  updateEntry,
} from './setlists.repository';
import type { setlistEntryCreateSchema } from './setlists.schema';

type EntryCreateInput = z.infer<typeof setlistEntryCreateSchema>;

export async function getSetlistBySession(sessionId: string): Promise<SetlistRow | null> {
  return await findSetlistBySession(sessionId);
}

export async function createSetlistForSession(
  sessionId: string,
): Promise<{ kind: 'ok'; setlist: SetlistRow } | { kind: 'already-exists' }> {
  const existing = await findSetlistBySession(sessionId);
  if (existing !== null) return { kind: 'already-exists' };
  const setlist = await insertSetlist(sessionId);
  return { kind: 'ok', setlist };
}

export async function getEntries(setlistId: string): Promise<SetlistEntryRow[]> {
  return await listEntries(setlistId);
}

export async function appendEntry(
  setlistId: string,
  input: EntryCreateInput,
): Promise<SetlistEntryRow> {
  const existing = await listEntries(setlistId);
  return await insertEntry({
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
  setlistId: string,
  entryId: string,
  input: Partial<EntryCreateInput>,
): Promise<{ kind: 'ok'; entry: SetlistEntryRow } | { kind: 'empty' } | { kind: 'not-found' }> {
  if (Object.keys(input).length === 0) return { kind: 'empty' };
  const entry = await updateEntry(setlistId, entryId, input);
  if (entry === null) return { kind: 'not-found' };
  return { kind: 'ok', entry };
}

export async function removeEntryAndCompact(
  setlistId: string,
  entryId: string,
): Promise<DeletionOutcome> {
  const outcome = await deleteEntry(setlistId, entryId);
  if (outcome === 'not-found') return outcome;
  // Compact positions so the next append lands at the right index.
  const remaining = await listEntries(setlistId);
  for (let position = 0; position < remaining.length; position += 1) {
    const entry = remaining[position];
    if (entry === undefined) continue;
    await setEntryPosition(entry.id, position);
  }
  return outcome;
}

export type ReorderResult = { kind: 'ok' } | { kind: 'stale' };

export async function reorderEntries(
  setlistId: string,
  entryIds: readonly string[],
): Promise<ReorderResult> {
  const existing = await listEntryIds(setlistId);
  if (entryIds.length !== existing.length) return { kind: 'stale' };
  const existingIds = new Set(existing.map((row) => row.id));
  for (const entryId of entryIds) {
    if (!existingIds.has(entryId)) return { kind: 'stale' };
  }
  for (let position = 0; position < entryIds.length; position += 1) {
    const entryId = entryIds[position];
    if (entryId === undefined) continue;
    await setEntryPosition(entryId, position);
  }
  return { kind: 'ok' };
}
