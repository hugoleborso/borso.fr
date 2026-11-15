/** @Feature songs */

export interface SetlistOfSong {
  readonly id: string;
  readonly name: string;
  readonly songIds: readonly string[];
}

// @FollowsBlueprint core-view-projection
export function selectSetlistsOfSong<Setlist extends SetlistOfSong>(
  setlists: readonly Setlist[],
  songId: string,
): Setlist[] {
  return setlists.filter((setlist) => setlist.songIds.includes(songId));
}

export interface SetlistsLine {
  readonly messageKey: 'catalog.inNoSetlist' | 'catalog.inSetlists';
  readonly names: string;
}

const SETLIST_NAME_SEPARATOR = ', ';

export function describeSetlistsOfSong(
  setlists: readonly SetlistOfSong[],
  songId: string,
): SetlistsLine {
  const names = selectSetlistsOfSong(setlists, songId).map((setlist) => setlist.name);
  if (names.length === 0) return { messageKey: 'catalog.inNoSetlist', names: '' };
  return { messageKey: 'catalog.inSetlists', names: names.join(SETLIST_NAME_SEPARATOR) };
}
