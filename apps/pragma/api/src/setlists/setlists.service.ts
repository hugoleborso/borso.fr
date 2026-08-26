import type { z } from 'zod';
import type { DatabaseExecutor } from '../database/client';
import type { DeletionOutcome } from '../helpers/persistence/deletion.core';
import { getSessionById } from '../sessions/sessions.service';
import {
  buildSetlistSummaries,
  isSetlistRenamable,
  type SetlistSummary,
  tallySongsPerSetlist,
} from './setlists.core';
import {
  countEntriesWithin,
  deleteEntry,
  insertEntry,
  insertEntryWithin,
  listEntries,
  listEntryIds,
  listEntryOwners,
  type SetlistEntryRow,
  setEntryPosition,
  updateEntry,
} from './setlist-entry.repository';
import {
  deleteSessionLink,
  deleteSetlistWithEntries,
  findAudienceChoiceSetlistOfSession,
  findSetlistById,
  insertSessionLink,
  insertSetlist,
  listAllSessionLinks,
  listManualSetlistSongIdsOfSession,
  listSetlists,
  listSetlistsOfSession,
  type SetlistRow,
  updateSetlistName,
} from './setlists.repository';
import {
  AUDIENCE_CHOICE_SETLIST_KIND,
  AUDIENCE_CHOICE_SETLIST_NAME,
  DEFAULT_SETLIST_KIND,
  type SetlistEntryPersistedUpdate,
  type setlistCreateSchema,
  type setlistEntryCreateSchema,
} from './setlists.schema';

type EntryCreateInput = z.infer<typeof setlistEntryCreateSchema>;
type SetlistCreateInput = z.infer<typeof setlistCreateSchema>;

export type LinkOutcome = { kind: 'ok' } | { kind: 'not-found' };

// @FollowsBlueprint service-read-model
export async function getAllSetlists(): Promise<SetlistSummary[]> {
  const setlists = await listSetlists();
  const setlistIds = setlists.map((setlist) => setlist.id);
  const [entryOwners, links] = await Promise.all([
    listEntryOwners(setlistIds),
    listAllSessionLinks(),
  ]);
  return buildSetlistSummaries(setlists, tallySongsPerSetlist(setlistIds, entryOwners), links);
}

export async function getSetlistsOfSession(sessionId: string): Promise<SetlistSummary[]> {
  const setlists = await listSetlistsOfSession(sessionId);
  const setlistIds = setlists.map((setlist) => setlist.id);
  const entryOwners = await listEntryOwners(setlistIds);
  return buildSetlistSummaries(
    setlists,
    tallySongsPerSetlist(setlistIds, entryOwners),
    setlists.map((setlist) => ({ setlistId: setlist.id, sessionId })),
  );
}

export async function findSetlist(setlistId: string): Promise<SetlistRow | null> {
  return await findSetlistById(setlistId);
}

export async function createSetlist(
  input: SetlistCreateInput,
): Promise<{ kind: 'ok'; setlist: SetlistRow } | { kind: 'session-not-found' }> {
  if (input.sessionId !== null) {
    const session = await getSessionById(input.sessionId);
    if (session === null) return { kind: 'session-not-found' };
  }
  const setlist = await insertSetlist(input.name, input.sessionId, DEFAULT_SETLIST_KIND);
  return { kind: 'ok', setlist };
}

export type RenameOutcome =
  { kind: 'ok'; setlist: SetlistRow } | { kind: 'not-found' } | { kind: 'not-renamable' };

// @FollowsBlueprint service-crud-update
export async function renameSetlist(setlistId: string, name: string): Promise<RenameOutcome> {
  const existing = await findSetlistById(setlistId);
  if (existing === null) return { kind: 'not-found' };
  if (!isSetlistRenamable(existing.kind)) return { kind: 'not-renamable' };
  const setlist = await updateSetlistName(setlistId, name);
  if (setlist === null) return { kind: 'not-found' };
  return { kind: 'ok', setlist };
}

export async function getManualSetlistSongIdsOfSession(sessionId: string): Promise<string[]> {
  return await listManualSetlistSongIdsOfSession(sessionId);
}

export async function findOrCreateAudienceChoiceSetlist(sessionId: string): Promise<SetlistRow> {
  const existing = await findAudienceChoiceSetlistOfSession(sessionId);
  if (existing !== null) return existing;
  return await insertSetlist(AUDIENCE_CHOICE_SETLIST_NAME, sessionId, AUDIENCE_CHOICE_SETLIST_KIND);
}

// @FollowsBlueprint service-facade-reexport
export { runInOneSetlistTransaction } from './setlists.repository';

export async function appendSongWithin(
  executor: DatabaseExecutor,
  setlistId: string,
  songId: string,
): Promise<void> {
  const position = await countEntriesWithin(executor, setlistId);
  await insertEntryWithin(executor, {
    setlistId,
    songId,
    position,
    energy: null,
    lineupOverride: null,
    keyOverride: null,
    capo: null,
    notes: '',
  });
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
  await insertSessionLink(sessionId, setlistId);
  return { kind: 'ok' };
}

export async function unlinkSetlistFromSession(
  setlistId: string,
  sessionId: string,
): Promise<DeletionOutcome> {
  return await deleteSessionLink(sessionId, setlistId);
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

async function compactEntryPositions(setlistId: string): Promise<void> {
  const remaining = await listEntries(setlistId);
  for (let position = 0; position < remaining.length; position += 1) {
    const entry = remaining[position];
    if (entry === undefined) continue;
    await setEntryPosition(entry.id, position);
  }
}

export async function removeEntryAndCompact(
  setlistId: string,
  entryId: string,
): Promise<DeletionOutcome> {
  const outcome = await deleteEntry(setlistId, entryId);
  if (outcome === 'not-found') return outcome;
  await compactEntryPositions(setlistId);
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
