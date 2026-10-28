/** @Feature setlists */

import type { SongStatus } from '../molecules/StatusChip';

export const ADD_SONGS_FILTERS = [
  'not-in-setlist',
  'concert-ready',
  'rehearsed',
  'learning',
  'ideas',
] as const;

export type AddSongsFilter = (typeof ADD_SONGS_FILTERS)[number];

export const DEFAULT_ADD_SONGS_FILTER: AddSongsFilter = 'not-in-setlist';

const STATUS_BY_FILTER: Readonly<Record<Exclude<AddSongsFilter, 'not-in-setlist'>, SongStatus>> = {
  'concert-ready': 'concert_ready',
  rehearsed: 'rehearsed',
  learning: 'wip',
  ideas: 'idea',
};

export interface CandidateSong {
  readonly id: string;
  readonly title: string;
  readonly artist: string;
  readonly status: SongStatus;
}

export interface AddSongsRow<Song extends CandidateSong> {
  readonly song: Song;
  readonly pickNumber: number | null;
  readonly positionInSetlist: number | null;
}

export interface AddSongsRowsInput<Song extends CandidateSong> {
  readonly songs: readonly Song[];
  readonly setlistSongIds: readonly string[];
  readonly pickedSongIds: readonly string[];
  readonly query: string;
  readonly filter: AddSongsFilter;
}

export type AddSongsEmptyMessageKey = 'setlist.addSongsEveryoneIn' | 'setlist.addSongNoMatch';

function normalize(value: string): string {
  // Stryker disable next-line MethodExpression: equivalent mutant. The typed text and the song's title and artist go through this same fold, so folding them all to upper case matches the same songs.
  return value.trim().toLowerCase();
}

function isMatchingQuery(song: CandidateSong, needle: string): boolean {
  return normalize(song.title).includes(needle) || normalize(song.artist).includes(needle);
}

function indexPositionsInSetlist(setlistSongIds: readonly string[]): ReadonlyMap<string, number> {
  const positions = new Map<string, number>();
  for (const [index, songId] of setlistSongIds.entries()) {
    if (!positions.has(songId)) positions.set(songId, index + 1);
  }
  return positions;
}

function isKeptByFilter(
  song: CandidateSong,
  filter: AddSongsFilter,
  isInSetlist: boolean,
): boolean {
  if (filter === 'not-in-setlist') return !isInSetlist;
  return song.status === STATUS_BY_FILTER[filter];
}

// @FollowsBlueprint core-view-projection
export function buildAddSongsRows<Song extends CandidateSong>(
  input: AddSongsRowsInput<Song>,
): AddSongsRow<Song>[] {
  const needle = normalize(input.query);
  const positions = indexPositionsInSetlist(input.setlistSongIds);
  return input.songs
    .filter((song) => isMatchingQuery(song, needle))
    .filter((song) => isKeptByFilter(song, input.filter, positions.has(song.id)))
    .toSorted((left, right) => left.title.localeCompare(right.title))
    .map((song) => {
      const pickIndex = input.pickedSongIds.indexOf(song.id);
      return {
        song,
        pickNumber: pickIndex === -1 ? null : pickIndex + 1,
        positionInSetlist: positions.get(song.id) ?? null,
      };
    });
}

export function shouldSearchMusicService(songs: readonly CandidateSong[], query: string): boolean {
  const needle = normalize(query);
  if (needle.length === 0) return false;
  return !songs.some((song) => isMatchingQuery(song, needle));
}

export function togglePick(pickedSongIds: readonly string[], songId: string): string[] {
  if (pickedSongIds.includes(songId)) return pickedSongIds.filter((picked) => picked !== songId);
  return [...pickedSongIds, songId];
}

export function addPick(pickedSongIds: readonly string[], songId: string): string[] {
  if (pickedSongIds.includes(songId)) return [...pickedSongIds];
  return [...pickedSongIds, songId];
}

export interface AddSongsEmptyInput {
  readonly filter: AddSongsFilter;
  readonly query: string;
  readonly rowCount: number;
  readonly isSearchingService: boolean;
}

export function selectAddSongsEmptyMessageKey({
  filter,
  query,
  rowCount,
  isSearchingService,
}: AddSongsEmptyInput): AddSongsEmptyMessageKey | null {
  if (rowCount > 0 || isSearchingService) return null;
  const isDefaultView = filter === DEFAULT_ADD_SONGS_FILTER && normalize(query).length === 0;
  return isDefaultView ? 'setlist.addSongsEveryoneIn' : 'setlist.addSongNoMatch';
}
