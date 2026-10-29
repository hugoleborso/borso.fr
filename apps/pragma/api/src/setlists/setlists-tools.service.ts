import type { DeletionOutcome } from '../helpers/persistence/deletion.core';
import {
  type NamedLineupInput,
  readLineupNames,
  resolveNamedLineupOrRefuse,
} from '../instruments/instruments.service';
import { refuseTool, refuseUnresolvedReference, resolveReference } from '../mcp/mcp.service';
import { describeInvalidFields } from '../mcp/tool-refusal.core';
import { getTransitionComments } from '../transitions/transitions.service';
import type { WriteActor } from '../notifications/notifications.service';
import {
  readSessionForTool,
  resolveSessionId,
  type SessionToolView,
} from '../sessions/sessions.service';
import { getSongs, resolveSongIds } from '../songs/songs.service';
import {
  countEntriesWithin,
  deleteEntryWithin,
  insertEntryWithin,
  listEntries,
  listEntriesOfSetlists,
  listEntryIdsInOrderWithin,
} from './setlist-entry.repository';
import {
  attachTransitionComments,
  type CreationOnlyFields,
  describeSetlist,
  type EntryWithTransitionView,
  listCreationOnlyIssues,
  listNamedCandidates,
  matchEntryReference,
  nameSongs,
  planEntryOrder,
  projectEntriesForTool,
  projectSetlistsWithEntries,
  type ReorderRequest,
} from './setlist-tool.core';
import type { SetlistSummary } from './setlists.core';
import {
  didClaimSetlistWithin,
  findSetlistById,
  listSetlists,
  listSetlistsOfSession,
  runInOneSetlistTransaction,
} from './setlists.repository';
import {
  getAllSetlists,
  getSetlistsOfSession,
  linkSetlistToSession,
  type LinkOutcome,
  notifySetlistChangedById,
  reorderEntries,
  type ReorderResult,
  unlinkSetlistFromSession,
  writeEntryPositionsWithin,
} from './setlists.service';
import type { SetlistEntryPersistedUpdate } from './setlists.schema';
import {
  type CloseOutcome,
  closeVote,
  lockVoteKeepingEntries,
  type VoteLockOutcome,
} from './voting.service';

export { resolveSessionId } from '../sessions/sessions.service';
export { defineDeletion, type ToolActor } from '../mcp/mcp.service';
export { resolveSongIds } from '../songs/songs.service';

export type ToolVoteClosing = CloseOutcome | VoteLockOutcome;

export async function closeVoteForTool(
  setlistId: string,
  songs: readonly string[] | undefined,
): Promise<ToolVoteClosing> {
  if (songs === undefined) return await lockVoteKeepingEntries(setlistId);
  return await closeVote({ setlistId, songIds: await resolveSongIds(songs) });
}

export async function resolveSetlistId(reference: string): Promise<string> {
  return await resolveReference('setlist', reference, async () =>
    listNamedCandidates(await listSetlists()),
  );
}

export async function getSetlistsForTool(
  sessionReference: string | undefined,
  now: Date,
): Promise<SetlistSummary[]> {
  if (sessionReference === undefined) return await getAllSetlists();
  return await getSetlistsOfSession(await resolveSessionId(sessionReference, now));
}

export interface SetlistToolView {
  readonly setlist: ReturnType<typeof describeSetlist>;
  readonly entries: readonly EntryWithTransitionView[];
}

export async function readSetlistForTool(setlistId: string): Promise<SetlistToolView | null> {
  const [setlist, entries, songs, names, transitionComments] = await Promise.all([
    findSetlistById(setlistId),
    listEntries(setlistId),
    getSongs(),
    readLineupNames(),
    getTransitionComments(),
  ]);
  if (setlist === null) return null;
  return {
    setlist: describeSetlist(setlist),
    entries: attachTransitionComments(
      projectEntriesForTool(entries, songs, names),
      transitionComments,
    ),
  };
}

export function refuseCreationOnlyFields(fields: CreationOnlyFields): void {
  const issues = listCreationOnlyIssues(fields);
  if (issues.length > 0) refuseTool(describeInvalidFields(issues));
}

export interface SessionPlanToolView {
  readonly session: SessionToolView;
  readonly setlists: ReturnType<typeof projectSetlistsWithEntries>;
}

export async function readSessionPlanForTool(
  reference: string,
  now: Date,
): Promise<SessionPlanToolView | null> {
  const sessionId = await resolveSessionId(reference, now);
  const [session, setlists, songs, names] = await Promise.all([
    readSessionForTool(sessionId),
    listSetlistsOfSession(sessionId),
    getSongs(),
    readLineupNames(),
  ]);
  if (session === null) return null;
  const sessionEntries = await listEntriesOfSetlists(setlists.map((setlist) => setlist.id));
  return {
    session,
    setlists: projectSetlistsWithEntries(setlists, sessionEntries, songs, names),
  };
}

export async function resolveEntryIds(
  setlistId: string,
  references: readonly string[],
): Promise<string[]> {
  const [setlistEntries, songs] = await Promise.all([listEntries(setlistId), getSongs()]);
  return references.map((reference) => {
    const match = matchEntryReference(setlistEntries, songs, reference);
    if (match.kind === 'found') return match.id;
    return refuseUnresolvedReference('entry', reference, match);
  });
}

export async function resolveEntryId(setlistId: string, reference: string): Promise<string> {
  const [entryId] = await resolveEntryIds(setlistId, [reference]);
  return entryId ?? reference;
}

export interface ReorderReferences {
  readonly order?: readonly string[] | undefined;
  readonly move?: { readonly entry: string; readonly position: number } | undefined;
  readonly swap?: readonly string[] | undefined;
}

async function resolveReorderRequest(
  setlistId: string,
  references: ReorderReferences,
): Promise<ReorderRequest> {
  if (references.order !== undefined) {
    return { kind: 'order', entryIds: await resolveEntryIds(setlistId, references.order) };
  }
  if (references.move !== undefined) {
    const entryId = await resolveEntryId(setlistId, references.move.entry);
    return { kind: 'move', entryId, position: references.move.position };
  }
  if (references.swap !== undefined) {
    const [first = '', second = ''] = await resolveEntryIds(setlistId, references.swap);
    return { kind: 'swap', entryIds: [first, second] };
  }
  return { kind: 'none' };
}

export type ToolReorderResult = ReorderResult | { kind: 'empty' };

export async function reorderEntriesForTool(
  setlistId: string,
  references: ReorderReferences,
  actor: WriteActor,
): Promise<ToolReorderResult> {
  const request = await resolveReorderRequest(setlistId, references);
  const currentIds = (await listEntries(setlistId)).map((entry) => entry.id);
  const entryIds = planEntryOrder(currentIds, request);
  if (entryIds === null) return { kind: 'empty' };
  return await reorderEntries(setlistId, entryIds, actor);
}

export async function readEntryTitlesInOrder(setlistId: string): Promise<string[]> {
  const [setlistEntries, songs] = await Promise.all([listEntries(setlistId), getSongs()]);
  return nameSongs(
    setlistEntries.map((entry) => entry.songId),
    songs,
  );
}

export type AppendSongsOutcome = { kind: 'ok'; entryIds: string[] } | { kind: 'not-found' };

export async function appendSongs(
  setlistId: string,
  songIds: readonly string[],
  actor: WriteActor,
): Promise<AppendSongsOutcome> {
  const entryIds = await runInOneSetlistTransaction(async (executor) => {
    const isSetlistClaimed = await didClaimSetlistWithin(executor, setlistId);
    if (!isSetlistClaimed) return null;
    const firstPosition = await countEntriesWithin(executor, setlistId);
    const written: string[] = [];
    for (const [offset, songId] of songIds.entries()) {
      const entry = await insertEntryWithin(executor, {
        setlistId,
        songId,
        position: firstPosition + offset,
        energy: null,
        lineupOverride: null,
        keyOverride: null,
        capo: null,
        notes: '',
      });
      written.push(entry.id);
    }
    return written;
  });
  if (entryIds === null) return { kind: 'not-found' };
  await notifySetlistChangedById(setlistId, actor);
  return { kind: 'ok', entryIds };
}

export async function removeEntriesAndCompact(
  setlistId: string,
  entryIds: readonly string[],
  actor: WriteActor,
): Promise<DeletionOutcome> {
  const outcome = await runInOneSetlistTransaction(async (executor): Promise<DeletionOutcome> => {
    const isSetlistClaimed = await didClaimSetlistWithin(executor, setlistId);
    if (!isSetlistClaimed) return 'not-found';
    for (const entryId of entryIds) await deleteEntryWithin(executor, setlistId, entryId);
    await writeEntryPositionsWithin(executor, await listEntryIdsInOrderWithin(executor, setlistId));
    return 'deleted';
  });
  if (outcome === 'not-found') return outcome;
  await notifySetlistChangedById(setlistId, actor);
  return outcome;
}

export async function buildEntryUpdate(
  changes: Omit<SetlistEntryPersistedUpdate, 'lineupOverride' | 'songId'>,
  lineupOverride: NamedLineupInput | null | undefined,
): Promise<SetlistEntryPersistedUpdate> {
  if (lineupOverride === undefined) return changes;
  if (lineupOverride === null) return { ...changes, lineupOverride: null };
  return { ...changes, lineupOverride: await resolveNamedLineupOrRefuse(lineupOverride) };
}

export async function resolveOptionalSessionId(
  reference: string | undefined,
  now: Date,
): Promise<string | null> {
  if (reference === undefined) return null;
  return await resolveSessionId(reference, now);
}

export async function setSessionLink(
  setlistId: string,
  sessionId: string,
  isUnlinking: boolean,
  actor: WriteActor,
): Promise<LinkOutcome> {
  if (isUnlinking) {
    const outcome = await unlinkSetlistFromSession(setlistId, sessionId, actor);
    if (outcome === 'not-found') return { kind: 'not-found' };
    return { kind: 'ok' };
  }
  return await linkSetlistToSession(setlistId, sessionId, actor);
}
