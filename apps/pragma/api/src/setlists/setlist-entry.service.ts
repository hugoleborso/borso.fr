import type { z } from 'zod';
import type { DatabaseExecutor } from '../database/client';
import { isReorderOfTheSameIds } from '../helpers/ordering/reorder.core';
import type { DeletionOutcome } from '../helpers/persistence/deletion.core';
import type { WriteActor } from '../notifications/notifications.service';
import { didClaimSongWithin } from '../songs/songs.service';
import {
  countEntriesWithin,
  deleteEntryWithin,
  insertEntryWithin,
  listEntryIdsInOrderWithin,
  type SetlistEntryRow,
  setEntryPositionWithin,
  updateEntry,
} from './setlist-entry.repository';
import { didClaimSetlistWithin, runInOneSetlistTransaction } from './setlists.repository';
import type {
  SetlistEntryPersistedUpdate,
  setlistEntryBatchCreateSchema,
  setlistEntryCreateSchema,
} from './setlists.schema';
import { notifySetlistChangedById } from './setlists.service';

type EntryCreateInput = z.infer<typeof setlistEntryCreateSchema>;
type EntryBatchCreateInput = z.infer<typeof setlistEntryBatchCreateSchema>;

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

export type AddEntriesOutcome =
  | { kind: 'ok'; entries: SetlistEntryRow[] }
  | { kind: 'not-found' }
  | { kind: 'song-not-found' };

async function didClaimEverySongWithin(
  executor: DatabaseExecutor,
  songIds: readonly string[],
): Promise<boolean> {
  for (const songId of songIds) {
    if (!(await didClaimSongWithin(executor, songId))) return false;
  }
  return true;
}

async function appendSongsWithin(
  executor: DatabaseExecutor,
  setlistId: string,
  songIds: readonly string[],
): Promise<SetlistEntryRow[]> {
  const firstPosition = await countEntriesWithin(executor, setlistId);
  const appended: SetlistEntryRow[] = [];
  for (const [offset, songId] of songIds.entries()) {
    appended.push(
      await insertEntryWithin(executor, {
        setlistId,
        songId,
        position: firstPosition + offset,
        energy: null,
        lineupOverride: null,
        keyOverride: null,
        capo: null,
        notes: '',
      }),
    );
  }
  return appended;
}

// @FollowsBlueprint service-crud-update
export async function addEntries(
  setlistId: string,
  input: EntryBatchCreateInput,
  actor: WriteActor,
): Promise<AddEntriesOutcome> {
  const outcome = await runInOneSetlistTransaction(async (executor): Promise<AddEntriesOutcome> => {
    const isSetlistClaimed = await didClaimSetlistWithin(executor, setlistId);
    if (!isSetlistClaimed) return { kind: 'not-found' };
    const isEverySongClaimed = await didClaimEverySongWithin(executor, input.songIds);
    if (!isEverySongClaimed) return { kind: 'song-not-found' };
    return { kind: 'ok', entries: await appendSongsWithin(executor, setlistId, input.songIds) };
  });
  if (outcome.kind !== 'ok') return outcome;
  await notifySetlistChangedById(setlistId, actor);
  return outcome;
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
