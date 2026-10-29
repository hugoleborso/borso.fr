import { type Lineup, resolveLineup } from '@domain/lineup.core';
import { resolveSetlistStatus } from '@domain/setlist-vote.core';
import {
  matchReference,
  type ReferenceCandidate,
  type ReferenceMatch,
} from '../helpers/reference/reference.core';
import { type LineupNames, nameLineup } from '../instruments/lineup-names.core';
import type { FieldIssue } from '../mcp/tool-refusal.core';

export interface CatalogueSong {
  readonly id: string;
  readonly title: string;
  readonly defaultLineup: Lineup;
}

export interface OrderedEntry {
  readonly id: string;
  readonly setlistId: string;
  readonly songId: string;
  readonly position: number;
  readonly lineupOverride: Lineup | null;
  readonly energy: number | null;
  readonly keyOverride: string | null;
  readonly capo: number | null;
  readonly notes: string;
}

export interface NamedSetlist {
  readonly id: string;
  readonly name: string;
  readonly status: string | null;
}

export interface EntryToolView {
  readonly entryId: string;
  readonly position: number;
  readonly songId: string;
  readonly title: string;
  readonly energy: number | null;
  readonly key: string | null;
  readonly capo: number | null;
  readonly notes: string;
  readonly lineup: Record<string, string>;
}

export type ReorderRequest =
  | { readonly kind: 'order'; readonly entryIds: readonly string[] }
  | { readonly kind: 'move'; readonly entryId: string; readonly position: number }
  | { readonly kind: 'swap'; readonly entryIds: readonly [string, string] }
  | { readonly kind: 'none' };

const FIRST_POSITION = 1;

export function listNamedCandidates(
  setlists: readonly { readonly id: string; readonly name: string }[],
): ReferenceCandidate[] {
  return setlists.map((setlist) => ({ id: setlist.id, label: setlist.name }));
}

function titleOf(songs: readonly CatalogueSong[], songId: string): string {
  return songs.find((song) => song.id === songId)?.title ?? songId;
}

// @FollowsBlueprint core-projection
export function projectEntriesForTool(
  entries: readonly OrderedEntry[],
  songs: readonly CatalogueSong[],
  names: LineupNames,
): EntryToolView[] {
  return entries
    .toSorted((left, right) => left.position - right.position)
    .map((entry) => {
      const defaultLineup = songs.find((song) => song.id === entry.songId)?.defaultLineup ?? {};
      return {
        entryId: entry.id,
        position: entry.position + FIRST_POSITION,
        songId: entry.songId,
        title: titleOf(songs, entry.songId),
        energy: entry.energy,
        key: entry.keyOverride,
        capo: entry.capo,
        notes: entry.notes,
        lineup: nameLineup(resolveLineup(defaultLineup, entry.lineupOverride), names),
      };
    });
}

export function describeSetlist(setlist: NamedSetlist) {
  return { id: setlist.id, name: setlist.name, status: resolveSetlistStatus(setlist.status) };
}

// @FollowsBlueprint core-projection
export function projectSetlistsWithEntries(
  setlists: readonly NamedSetlist[],
  entries: readonly OrderedEntry[],
  songs: readonly CatalogueSong[],
  names: LineupNames,
) {
  return setlists.map((setlist) => ({
    ...describeSetlist(setlist),
    entries: projectEntriesForTool(
      entries.filter((entry) => entry.setlistId === setlist.id),
      songs,
      names,
    ),
  }));
}

function describeEntry(entry: OrderedEntry, songs: readonly CatalogueSong[]): ReferenceCandidate {
  return {
    id: entry.id,
    label: titleOf(songs, entry.songId),
    hint: `#${String(entry.position + FIRST_POSITION)}`,
  };
}

// @FollowsBlueprint core-decision
export function matchEntryReference(
  entries: readonly OrderedEntry[],
  songs: readonly CatalogueSong[],
  reference: string,
): ReferenceMatch {
  const candidates = entries.map((entry) => describeEntry(entry, songs));
  const [onlyOfSong, ...othersOfSong] = entries.filter((entry) => entry.songId === reference);
  if (onlyOfSong === undefined) return matchReference(candidates, reference);
  if (othersOfSong.length === 0) return { kind: 'found', id: onlyOfSong.id };
  return {
    kind: 'ambiguous',
    candidates: [onlyOfSong, ...othersOfSong].map((entry) => describeEntry(entry, songs)),
  };
}

function clampPosition(position: number, count: number): number {
  return Math.min(Math.max(position, FIRST_POSITION), count) - FIRST_POSITION;
}

// @FollowsBlueprint core-decision
export function planEntryOrder(
  currentIds: readonly string[],
  request: ReorderRequest,
): readonly string[] | null {
  if (request.kind === 'none') return null;
  if (request.kind === 'order') return request.entryIds;
  if (request.kind === 'move') {
    const others = currentIds.filter((id) => id !== request.entryId);
    const index = clampPosition(request.position, currentIds.length);
    return [...others.slice(0, index), request.entryId, ...others.slice(index)];
  }
  const [first, second] = request.entryIds;
  return currentIds.map((id) => (id === first ? second : id === second ? first : id));
}

export function nameSongs(songIds: readonly string[], songs: readonly CatalogueSong[]): string[] {
  return songIds.map((songId) => titleOf(songs, songId));
}

export interface TransitionCommentNote {
  readonly songAId: string;
  readonly songBId: string;
  readonly comment: string;
}

export type EntryWithTransitionView = EntryToolView & { readonly transitionComment?: string };

const SONG_PAIR_SEPARATOR = '→';

function describeSongPair(songAId: string, songBId: string): string {
  return `${songAId}${SONG_PAIR_SEPARATOR}${songBId}`;
}

// @FollowsBlueprint core-projection
export function attachTransitionComments(
  entries: readonly EntryToolView[],
  comments: readonly TransitionCommentNote[],
): EntryWithTransitionView[] {
  const commentByPair = new Map(
    comments.map((note) => [describeSongPair(note.songAId, note.songBId), note.comment]),
  );
  return entries.map((entry, index) => {
    const next = entries[index + 1];
    if (next === undefined) return entry;
    const comment = commentByPair.get(describeSongPair(entry.songId, next.songId));
    return comment === undefined ? entry : { ...entry, transitionComment: comment };
  });
}

export interface CreationOnlyFields {
  readonly session?: string;
  readonly songs?: readonly string[];
}

const CREATION_ONLY_PROBLEM = 'only when creating; use link_setlist or add_setlist_entries';

export function listCreationOnlyIssues(fields: CreationOnlyFields): FieldIssue[] {
  return Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([field]) => ({ path: [field], message: CREATION_ONLY_PROBLEM }));
}
