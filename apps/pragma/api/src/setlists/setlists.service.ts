/**
 * Service layer for setlists. Owns the position-compaction after
 * delete, the reorder validation (refuse stale client payloads), the
 * assembly of the list read models, and the rule that a setlist is
 * only ever attached to a session that exists.
 */

import type { z } from 'zod';
import type { DeletionOutcome } from '../helpers/persistence/deletion.core';
import { getSessionById } from '../sessions/sessions.service';
import { buildSetlistSummaries, type SetlistSummary } from './setlists.core';
import {
  countEntriesBySetlist,
  deleteEntry,
  deleteSessionLink,
  deleteSetlistWithEntries,
  findNextLinkPosition,
  findSetlistById,
  insertEntry,
  insertSessionLink,
  insertSetlist,
  listAllSessionLinks,
  listEntries,
  listEntryIds,
  listSetlists,
  listSetlistsOfSession,
  type SetlistEntryRow,
  type SetlistRow,
  setEntryPosition,
  updateEntry,
  updateSetlistName,
} from './setlists.repository';
import type {
  SetlistEntryPersistedUpdate,
  setlistCreateSchema,
  setlistEntryCreateSchema,
} from './setlists.schema';

type EntryCreateInput = z.infer<typeof setlistEntryCreateSchema>;
type SetlistCreateInput = z.infer<typeof setlistCreateSchema>;

export type LinkOutcome = { kind: 'ok' } | { kind: 'not-found' };

// @FollowsBlueprint service-read-model
export async function getAllSetlists(): Promise<SetlistSummary[]> {
  const setlists = await listSetlists();
  const [songCounts, links] = await Promise.all([
    countEntriesBySetlist(setlists.map((setlist) => setlist.id)),
    listAllSessionLinks(),
  ]);
  return buildSetlistSummaries(setlists, songCounts, links);
}

export async function getSetlistsOfSession(sessionId: string): Promise<SetlistSummary[]> {
  const setlists = await listSetlistsOfSession(sessionId);
  const songCounts = await countEntriesBySetlist(setlists.map((setlist) => setlist.id));
  return buildSetlistSummaries(
    setlists,
    songCounts,
    setlists.map((setlist) => ({ setlistId: setlist.id, sessionId })),
  );
}

export async function getSetlist(setlistId: string): Promise<SetlistRow | null> {
  return await findSetlistById(setlistId);
}

/**
 * Creates the setlist and, when the caller named a session, attaches it
 * in the same call. The attach is what makes the button on a session's
 * own page one tap rather than two, and a missing session is refused
 * before the setlist is written so no half-linked row survives.
 */
export async function createSetlist(
  input: SetlistCreateInput,
): Promise<{ kind: 'ok'; setlist: SetlistRow } | { kind: 'session-not-found' }> {
  if (input.sessionId !== null) {
    const session = await getSessionById(input.sessionId);
    if (session === null) return { kind: 'session-not-found' };
  }
  const setlist = await insertSetlist(input.name);
  if (input.sessionId !== null) {
    await attachToSession(setlist.id, input.sessionId);
  }
  return { kind: 'ok', setlist };
}

export async function renameSetlist(setlistId: string, name: string): Promise<SetlistRow | null> {
  return await updateSetlistName(setlistId, name);
}

export async function removeSetlist(setlistId: string): Promise<DeletionOutcome> {
  return await deleteSetlistWithEntries(setlistId);
}

export async function linkSetlistToSession(
  setlistId: string,
  sessionId: string,
): Promise<LinkOutcome> {
  const [setlist, session] = await Promise.all([
    findSetlistById(setlistId),
    getSessionById(sessionId),
  ]);
  if (setlist === null || session === null) return { kind: 'not-found' };
  await attachToSession(setlistId, sessionId);
  return { kind: 'ok' };
}

export async function unlinkSetlistFromSession(
  setlistId: string,
  sessionId: string,
): Promise<DeletionOutcome> {
  return await deleteSessionLink(sessionId, setlistId);
}

async function attachToSession(setlistId: string, sessionId: string): Promise<void> {
  const position = await findNextLinkPosition(sessionId);
  await insertSessionLink(sessionId, setlistId, position);
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

// @FollowsBlueprint service-crud-update
export async function patchEntry(
  setlistId: string,
  entryId: string,
  input: SetlistEntryPersistedUpdate,
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
