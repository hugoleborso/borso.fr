/** @Feature setlists */

export interface PickableSong {
  readonly id: string;
  readonly title: string;
  readonly artist: string;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

// @FollowsBlueprint core-view-projection
export function filterPickableSongs<Song extends PickableSong>(
  songs: readonly Song[],
  query: string,
): Song[] {
  const needle = normalize(query);
  const sorted = songs.toSorted((left, right) => left.title.localeCompare(right.title));
  return sorted.filter(
    (song) =>
      song.title.toLowerCase().includes(needle) || song.artist.toLowerCase().includes(needle),
  );
}

export function shouldOfferCreatingSong(songs: readonly PickableSong[], query: string): boolean {
  const needle = normalize(query);
  if (needle.length === 0) return false;
  return !songs.some((song) => normalize(song.title) === needle);
}

export function selectPickerCloseLabelKey(
  addedCount: number,
): 'setlist.addSongDone' | 'common.cancel' {
  return addedCount > 0 ? 'setlist.addSongDone' : 'common.cancel';
}
