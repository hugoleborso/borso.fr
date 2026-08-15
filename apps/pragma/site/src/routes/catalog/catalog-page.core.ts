/**
 * Decisions the catalog page makes: which songs a filter and a search
 * box leave visible, how many songs each status filter would show, and
 * which lineup entries carry a real instrument.
 * @Feature songs
 */

import type { Lineup } from '@domain/lineup.core';

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

// @FollowsBlueprint core-view-projection
export function selectVisibleSongs<Song extends CatalogSong>(
  songs: readonly Song[],
  status: CatalogStatusFilter,
  query: string,
): Song[] {
  return songs.filter(
    (song) => isMatchingStatusFilter(song, status) && isMatchingSearch(song, query),
  );
}

/** A member holding no instrument sits the song out, which the card omits. */
export function compactLineup(lineup: Lineup): Record<string, readonly string[]> {
  const compacted: Record<string, readonly string[]> = {};
  for (const [memberId, instrumentIds] of Object.entries(lineup)) {
    if (instrumentIds.length > 0) compacted[memberId] = instrumentIds;
  }
  return compacted;
}

const NEW_SONG_PATH = '/catalog/new';

/**
 * Where the create button goes. What the operator typed in the search box is
 * the title they were looking for and did not find, so it travels to the form
 * rather than being typed twice.
 */
export function buildNewSongPath(search: string): string {
  const title = search.trim();
  if (title.length === 0) return NEW_SONG_PATH;
  return `${NEW_SONG_PATH}?title=${encodeURIComponent(title)}`;
}

/**
 * What the empty grid says. "No songs yet" is true of an empty catalog and
 * false of a search that matched nothing, and the second is the case the
 * operator is far more often looking at.
 */
export function selectCatalogEmptyMessageKey(
  search: string,
): 'catalog.emptyList' | 'catalog.emptySearch' {
  return search.trim().length === 0 ? 'catalog.emptyList' : 'catalog.emptySearch';
}
