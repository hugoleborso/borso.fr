/**
 * Decisions the catalog page makes: which songs a filter and a search
 * box leave visible, how many songs each status filter would show, and
 * which lineup entries carry a real instrument.
 */

export const CATALOG_STATUS_FILTERS = ['all', 'concert_ready', 'rehearsed', 'wip', 'idea'] as const;

export type CatalogStatusFilter = (typeof CATALOG_STATUS_FILTERS)[number];

export interface CatalogSong {
  readonly title: string;
  readonly artist: string;
  readonly status: string;
}

export function countSongsWithStatus(
  songs: readonly CatalogSong[],
  status: CatalogStatusFilter,
): number {
  if (status === 'all') return songs.length;
  return songs.filter((song) => song.status === status).length;
}

export function isMatchingSearch(song: CatalogSong, query: string): boolean {
  const normalised = query.trim().toLowerCase();
  if (normalised === '') return true;
  return (
    song.title.toLowerCase().includes(normalised) || song.artist.toLowerCase().includes(normalised)
  );
}

export function isMatchingStatusFilter(song: CatalogSong, status: CatalogStatusFilter): boolean {
  return status === 'all' || song.status === status;
}

export function sortSongsByTitle<Song extends CatalogSong>(songs: readonly Song[]): Song[] {
  return songs.toSorted((left, right) => left.title.localeCompare(right.title));
}

export function selectVisibleSongs<Song extends CatalogSong>(
  songs: readonly Song[],
  status: CatalogStatusFilter,
  query: string,
): Song[] {
  return songs.filter(
    (song) => isMatchingStatusFilter(song, status) && isMatchingSearch(song, query),
  );
}

/** A lineup slot with no instrument means "not playing", which the card omits. */
export function compactLineup(lineup: Record<string, string | null>): Record<string, string> {
  const compacted: Record<string, string> = {};
  for (const [memberId, instrumentId] of Object.entries(lineup)) {
    if (instrumentId !== null && instrumentId !== '') {
      compacted[memberId] = instrumentId;
    }
  }
  return compacted;
}
