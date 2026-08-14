/**
 * What the add-a-song sheet shows for what the operator typed.
 *
 * Two decisions: which songs match the query, and whether to offer creating
 * the song being typed. The offer only makes sense once something is typed and
 * no song already carries that exact title, otherwise the sheet invites the
 * band to enter the same song twice.
 */

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
  if (needle.length === 0) return sorted;
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

/**
 * What the sheet's closing button says. Once songs have gone in, the button is
 * the way out of a finished job rather than a way to back out of one.
 */
export function selectPickerCloseLabelKey(
  addedCount: number,
): 'setlist.addSongDone' | 'common.cancel' {
  return addedCount > 0 ? 'setlist.addSongDone' : 'common.cancel';
}
