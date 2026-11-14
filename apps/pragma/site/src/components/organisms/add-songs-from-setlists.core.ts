/** @Feature setlists */

import { addPick } from './add-songs.core';

export interface SourceSetlist {
  readonly id: string;
  readonly songIds: readonly string[];
}

export interface SourceSetlistToggleInput {
  readonly sourceSetlistId: string;
  readonly pickedSetlistIds: readonly string[];
  readonly pickedSongIds: readonly string[];
  readonly setlists: readonly SourceSetlist[];
  readonly setlistSongIds: readonly string[];
}

export interface SourceSetlistToggle {
  readonly pickedSetlistIds: readonly string[];
  readonly pickedSongIds: readonly string[];
}

// @FollowsBlueprint core-view-projection
export function listSourceSetlists<TSetlist extends SourceSetlist>(
  setlists: readonly TSetlist[],
  orderedIds: readonly string[],
  setlistId: string,
): TSetlist[] {
  return setlists
    .filter((setlist) => setlist.id !== setlistId && setlist.songIds.length > 0)
    .toSorted((left, right) => orderedIds.indexOf(left.id) - orderedIds.indexOf(right.id));
}

// @FollowsBlueprint core-view-projection
export function poolSourceSongIds(
  pickedSetlistIds: readonly string[],
  setlists: readonly SourceSetlist[],
  setlistSongIds: readonly string[],
): string[] {
  const pooled = pickedSetlistIds.flatMap(
    (pickedId) => setlists.find((setlist) => setlist.id === pickedId)?.songIds ?? [],
  );
  return [...new Set(pooled)].filter((songId) => !setlistSongIds.includes(songId));
}

export interface SourceSongRowsInput<Song extends { readonly id: string }> {
  readonly pickedSetlistIds: readonly string[];
  readonly setlists: readonly SourceSetlist[];
  readonly setlistSongIds: readonly string[];
  readonly songsById: Readonly<Record<string, Song>>;
  readonly pickedSongIds: readonly string[];
}

export interface SourceSongRow<Song> {
  readonly song: Song;
  readonly pickNumber: number | null;
}

// @FollowsBlueprint core-view-projection
export function buildSourceSongRows<Song extends { readonly id: string }>(
  input: SourceSongRowsInput<Song>,
): SourceSongRow<Song>[] {
  return poolSourceSongIds(input.pickedSetlistIds, input.setlists, input.setlistSongIds)
    .map((songId) => input.songsById[songId])
    .filter((song) => song !== undefined)
    .map((song) => {
      const pickIndex = input.pickedSongIds.indexOf(song.id);
      return { song, pickNumber: pickIndex === -1 ? null : pickIndex + 1 };
    });
}

// @FollowsBlueprint core-decision
export function toggleSourceSetlist(input: SourceSetlistToggleInput): SourceSetlistToggle {
  const isPicked = input.pickedSetlistIds.includes(input.sourceSetlistId);
  const pickedSetlistIds = isPicked
    ? input.pickedSetlistIds.filter((pickedId) => pickedId !== input.sourceSetlistId)
    : [...input.pickedSetlistIds, input.sourceSetlistId];
  const toggledSongIds = poolSourceSongIds(
    [input.sourceSetlistId],
    input.setlists,
    input.setlistSongIds,
  );
  if (!isPicked) {
    return {
      pickedSetlistIds,
      pickedSongIds: toggledSongIds.reduce<readonly string[]>(addPick, input.pickedSongIds),
    };
  }
  const stillPooled = poolSourceSongIds(pickedSetlistIds, input.setlists, input.setlistSongIds);
  const dropped = new Set(toggledSongIds.filter((songId) => !stillPooled.includes(songId)));
  return {
    pickedSetlistIds,
    pickedSongIds: input.pickedSongIds.filter((songId) => !dropped.has(songId)),
  };
}
