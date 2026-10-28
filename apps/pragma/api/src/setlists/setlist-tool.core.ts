import { type Lineup, resolveLineup } from '@domain/lineup.core';
import { resolveSetlistStatus } from '@domain/setlist-vote.core';
import {
  matchReference,
  type ReferenceCandidate,
  type ReferenceMatch,
} from '../helpers/reference/reference.core';
import { type LineupNames, nameLineup } from '../instruments/lineup-names.core';
import type { SongTally, VoteBudget } from './voting.core';

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

export interface TallyToolView {
  readonly song: string;
  readonly songId: string;
  readonly points: number;
  readonly voters: number;
}

export function nameTallies(
  tallies: readonly SongTally[],
  songs: readonly CatalogueSong[],
): TallyToolView[] {
  return tallies.map((tally) => ({
    song: titleOf(songs, tally.songId),
    songId: tally.songId,
    points: tally.points,
    voters: tally.voterCount,
  }));
}

export function nameSongs(songIds: readonly string[], songs: readonly CatalogueSong[]): string[] {
  return songIds.map((songId) => titleOf(songs, songId));
}

export interface VoteBoardReading {
  readonly status: string;
  readonly targetSongCount: number;
  readonly budget: VoteBudget;
  readonly tallies: readonly SongTally[];
  readonly lastScoredAt: string | null;
}

export type ProposalReading =
  | { readonly kind: 'ok'; readonly tallies: readonly SongTally[] }
  | { readonly kind: 'setlist-not-found' | 'not-voting' | 'no-votes' };

// @FollowsBlueprint core-projection
export function projectVoteBoardForTool(
  board: VoteBoardReading,
  proposal: ProposalReading,
  songs: readonly CatalogueSong[],
) {
  const view = {
    status: board.status,
    targetSongCount: board.targetSongCount,
    budget: board.budget,
    lastScoredAt: board.lastScoredAt,
    tallies: nameTallies(board.tallies, songs),
  };
  if (proposal.kind !== 'ok') return view;
  return {
    ...view,
    proposal: nameSongs(
      proposal.tallies.map((tally) => tally.songId),
      songs,
    ),
  };
}
