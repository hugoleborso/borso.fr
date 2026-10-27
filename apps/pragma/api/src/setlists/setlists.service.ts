import type { z } from 'zod';
import type { DatabaseExecutor } from '../database/client';
import { isReorderOfTheSameIds } from '../helpers/ordering/reorder.core';
import type { DeletionOutcome } from '../helpers/persistence/deletion.core';
import { notifyBand, type WriteActor } from '../notifications/notifications.service';
import { didClaimSessionWithin } from '../sessions/sessions.service';
import {
  buildSetlistSummaries,
  isSetlistRenamable,
  resolveSetlistKind,
  type SetlistSummary,
  tallySongsPerSetlist,
} from './setlists.core';
import {
  countEntriesWithin,
  deleteEntryWithin,
  insertEntryWithin,
  listEntries,
  listEntriesOfSetlists,
  listEntriesOfSongWithin,
  listEntryIdsInOrderWithin,
  listEntryOwners,
  type SetlistEntryRow,
  setEntryPositionWithin,
  updateEntry,
} from './setlist-entry.repository';
import {
  deleteSessionLink,
  didClaimSetlistWithin,
  deleteSetlistWithEntries,
  findAudienceChoiceSetlistOfSession,
  findSetlistById,
  insertAudienceChoiceSetlistWithin,
  insertSessionLinkAtEndWithin,
  insertSetlistWithin,
  listAllSessionLinks,
  listManualSetlistSongIdsOfSession,
  listSetlists,
  listSetlistsOfSession,
  runInOneSetlistTransaction,
  type SetlistRow,
  updateSetlistName,
} from './setlists.repository';
import {
  DEFAULT_SETLIST_KIND,
  type SetlistEntryPersistedUpdate,
  type setlistCreateSchema,
  type setlistEntryCreateSchema,
} from './setlists.schema';

type EntryCreateInput = z.infer<typeof setlistEntryCreateSchema>;
type SetlistCreateInput = z.infer<typeof setlistCreateSchema>;

export type LinkOutcome = { kind: 'ok' } | { kind: 'not-found' };

async function notifySetlistChanged(
  setlist: Pick<SetlistRow, 'id' | 'name'>,
  actor: WriteActor,
): Promise<void> {
  await notifyBand(
    {
      kind: 'setlist-changed',
      actorMemberId: actor.memberId,
      setlistId: setlist.id,
      setlistName: setlist.name,
    },
    actor.now,
  );
}

async function notifySetlistChangedById(setlistId: string, actor: WriteActor): Promise<void> {
  const setlist = await findSetlistById(setlistId);
  if (setlist === null) return;
  await notifySetlistChanged(setlist, actor);
}

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

async function attachToSessionWithin(
  executor: DatabaseExecutor,
  sessionId: string,
  writeSetlist: () => Promise<SetlistRow>,
): Promise<SetlistRow | null> {
  const isSessionClaimed = await didClaimSessionWithin(executor, sessionId);
  if (!isSessionClaimed) return null;
  const setlist = await writeSetlist();
  await insertSessionLinkAtEndWithin(executor, sessionId, setlist.id);
  return setlist;
}

export async function createSetlist(
  input: SetlistCreateInput,
  actor: WriteActor,
): Promise<{ kind: 'ok'; setlist: SetlistRow } | { kind: 'session-not-found' }> {
  const { sessionId } = input;
  const setlist = await runInOneSetlistTransaction(async (executor) => {
    const insertSetlist = async (): Promise<SetlistRow> =>
      await insertSetlistWithin(executor, input.name, DEFAULT_SETLIST_KIND);
    if (sessionId === null) return await insertSetlist();
    return await attachToSessionWithin(executor, sessionId, insertSetlist);
  });
  if (setlist === null) return { kind: 'session-not-found' };
  await notifySetlistChanged(setlist, actor);
  return { kind: 'ok', setlist };
}

export type RenameOutcome =
  { kind: 'ok'; setlist: SetlistRow } | { kind: 'not-found' } | { kind: 'not-renamable' };

// @FollowsBlueprint service-crud-update
export async function renameSetlist(
  setlistId: string,
  name: string,
  actor: WriteActor,
): Promise<RenameOutcome> {
  const existing = await findSetlistById(setlistId);
  if (existing === null) return { kind: 'not-found' };
  if (!isSetlistRenamable(resolveSetlistKind(existing.kind))) return { kind: 'not-renamable' };
  const setlist = await updateSetlistName(setlistId, name);
  if (setlist === null) return { kind: 'not-found' };
  await notifySetlistChanged(setlist, actor);
  return { kind: 'ok', setlist };
}

export async function getManualSetlistSongIdsOfSession(sessionId: string): Promise<string[]> {
  return await listManualSetlistSongIdsOfSession(sessionId);
}

export async function findOrCreateAudienceChoiceSetlist(
  sessionId: string,
): Promise<SetlistRow | null> {
  const existing = await findAudienceChoiceSetlistOfSession(sessionId);
  if (existing !== null) return existing;
  return await runInOneSetlistTransaction(
    async (executor) =>
      await attachToSessionWithin(
        executor,
        sessionId,
        async () => await insertAudienceChoiceSetlistWithin(executor, sessionId),
      ),
  );
}

// @FollowsBlueprint service-facade-reexport
export { didClaimSetlistWithin, runInOneSetlistTransaction } from './setlists.repository';
export { defineTool, type ToolActor, type ToolAnswer } from '../mcp/mcp.service';

export async function appendSongToClaimedSetlistWithin(
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
  actor: WriteActor,
): Promise<LinkOutcome> {
  const isLinked = await runInOneSetlistTransaction(async (executor) => {
    const isSetlistClaimed = await didClaimSetlistWithin(executor, setlistId);
    if (!isSetlistClaimed) return false;
    const isSessionClaimed = await didClaimSessionWithin(executor, sessionId);
    if (!isSessionClaimed) return false;
    await insertSessionLinkAtEndWithin(executor, sessionId, setlistId);
    return true;
  });
  if (!isLinked) return { kind: 'not-found' };
  await notifySetlistChangedById(setlistId, actor);
  return { kind: 'ok' };
}

export async function unlinkSetlistFromSession(
  setlistId: string,
  sessionId: string,
  actor: WriteActor,
): Promise<DeletionOutcome> {
  const outcome = await deleteSessionLink(sessionId, setlistId);
  if (outcome === 'not-found') return outcome;
  await notifySetlistChangedById(setlistId, actor);
  return outcome;
}

export async function getEntries(setlistId: string): Promise<SetlistEntryRow[]> {
  return await listEntries(setlistId);
}

export async function getEntriesOfSongWithin(
  executor: DatabaseExecutor,
  songId: string,
): Promise<SetlistEntryRow[]> {
  return await listEntriesOfSongWithin(executor, songId);
}

export async function getEntriesOfSetlists(
  setlistIds: readonly string[],
): Promise<SetlistEntryRow[]> {
  return await listEntriesOfSetlists(setlistIds);
}

export type AppendEntryOutcome = { kind: 'ok'; entry: SetlistEntryRow } | { kind: 'not-found' };

export async function appendEntry(
  setlistId: string,
  input: EntryCreateInput,
  actor: WriteActor,
): Promise<AppendEntryOutcome> {
  const entry = await runInOneSetlistTransaction(async (executor) => {
    const isSetlistClaimed = await didClaimSetlistWithin(executor, setlistId);
    if (!isSetlistClaimed) return null;
    return await insertEntryWithin(executor, {
      setlistId,
      songId: input.songId,
      position: await countEntriesWithin(executor, setlistId),
      energy: input.energy,
      lineupOverride: input.lineupOverride,
      keyOverride: input.keyOverride,
      capo: input.capo,
      notes: input.notes,
    });
  });
  if (entry === null) return { kind: 'not-found' };
  await notifySetlistChangedById(setlistId, actor);
  return { kind: 'ok', entry };
}

// @FollowsBlueprint service-crud-update
export async function patchEntry(
  setlistId: string,
  entryId: string,
  input: SetlistEntryPersistedUpdate,
  actor: WriteActor,
): Promise<{ kind: 'ok'; entry: SetlistEntryRow } | { kind: 'empty' } | { kind: 'not-found' }> {
  if (Object.keys(input).length === 0) return { kind: 'empty' };
  const entry = await updateEntry(setlistId, entryId, input);
  if (entry === null) return { kind: 'not-found' };
  await notifySetlistChangedById(setlistId, actor);
  return { kind: 'ok', entry };
}

async function writeEntryPositionsWithin(
  executor: DatabaseExecutor,
  entryIds: readonly string[],
): Promise<void> {
  for (const [position, entryId] of entryIds.entries()) {
    await setEntryPositionWithin(executor, entryId, position);
  }
}

export async function removeEntryAndCompact(
  setlistId: string,
  entryId: string,
  actor: WriteActor,
): Promise<DeletionOutcome> {
  const outcome = await runInOneSetlistTransaction(async (executor): Promise<DeletionOutcome> => {
    const isSetlistClaimed = await didClaimSetlistWithin(executor, setlistId);
    if (!isSetlistClaimed) return 'not-found';
    const deletion = await deleteEntryWithin(executor, setlistId, entryId);
    await writeEntryPositionsWithin(executor, await listEntryIdsInOrderWithin(executor, setlistId));
    return deletion;
  });
  if (outcome === 'not-found') return outcome;
  await notifySetlistChangedById(setlistId, actor);
  return outcome;
}

export type ReorderResult = { kind: 'ok' } | { kind: 'stale' } | { kind: 'not-found' };

export async function reorderEntries(
  setlistId: string,
  entryIds: readonly string[],
  actor: WriteActor,
): Promise<ReorderResult> {
  const reorder = await runInOneSetlistTransaction(async (executor): Promise<ReorderResult> => {
    const isSetlistClaimed = await didClaimSetlistWithin(executor, setlistId);
    if (!isSetlistClaimed) return { kind: 'not-found' };
    const existingIds = await listEntryIdsInOrderWithin(executor, setlistId);
    const isCurrent = isReorderOfTheSameIds(existingIds, entryIds);
    if (!isCurrent) return { kind: 'stale' };
    await writeEntryPositionsWithin(executor, entryIds);
    return { kind: 'ok' };
  });
  if (reorder.kind !== 'ok') return reorder;
  await notifySetlistChangedById(setlistId, actor);
  return reorder;
}
