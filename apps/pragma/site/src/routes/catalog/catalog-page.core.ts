/** @Feature songs */

import type { InstrumentIcon } from '@domain/instrument.core';
import { selectInstrumentIdsNamedInWords } from '../../components/molecules/lineup-slots.core';
import { type ChartKindTag, extractChartKind } from './chart-kind.utils';

export const CATALOG_FILTERS = [
  'all',
  'learning',
  'concert_ready',
  'rehearsed',
  'wip',
  'to_play',
  'idea',
] as const;

export type CatalogFilter = (typeof CATALOG_FILTERS)[number];

export type CatalogStatusFilter = Exclude<CatalogFilter, 'learning'>;

export const TO_LEARN_FILTER = 'learning';

const DEFAULT_FILTER: CatalogFilter = 'all';
const SCORE_AFTER_GLYPHS_PREFIX = '· ';
const MASTERY_SCALE = 10;

export interface CatalogSong {
  readonly title: string;
  readonly artist: string;
  readonly status: string;
}

export interface QueuedStudy {
  readonly songId: string;
  readonly instrumentId: string;
  readonly score: number | null;
  readonly isReady: boolean | null;
}

export interface SongToLearn<Song> {
  readonly song: Song;
  readonly instrumentIds: readonly string[];
  readonly lowestScore: number | null;
}

export const CATALOG_FILTER_PARAMETER = 'filter';

export function buildCatalogFilterSearch(filter: CatalogFilter): Record<string, string> {
  if (filter === DEFAULT_FILTER) return {};
  return { [CATALOG_FILTER_PARAMETER]: filter };
}

export function parseCatalogFilter(rawFilter: string | null): CatalogFilter {
  return CATALOG_FILTERS.find((filter) => filter === rawFilter) ?? DEFAULT_FILTER;
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

function lowerScore(current: number | null, next: number | null): number | null {
  if (current === null) return next;
  if (next === null) return current;
  return Math.min(current, next);
}

export function selectSongsToLearn<Song extends CatalogSong & { readonly id: string }>(
  songs: readonly Song[],
  queue: readonly QueuedStudy[],
  query: string,
): SongToLearn<Song>[] {
  const songsById = new Map(songs.map((song) => [song.id, song]));
  const bySongId = new Map<string, SongToLearn<Song>>();
  for (const study of queue) {
    const song = songsById.get(study.songId);
    if (song === undefined || study.isReady === true || !isMatchingSearch(song, query)) continue;
    const known = bySongId.get(study.songId);
    bySongId.set(study.songId, {
      song,
      instrumentIds: [...(known?.instrumentIds ?? []), study.instrumentId],
      lowestScore: known === undefined ? study.score : lowerScore(known.lowestScore, study.score),
    });
  }
  return [...bySongId.values()];
}

export interface SongCardSource<Status extends string> {
  readonly id: string;
  readonly title: string;
  readonly status: Status;
  readonly deezerAlbumId: string | null;
  readonly charts: readonly { readonly kind?: unknown }[];
}

export interface SongCardInstrument {
  readonly instrumentId: string;
  readonly name: string;
  readonly icon: InstrumentIcon;
  readonly isNameNeeded: boolean;
}

const NO_CARD_INSTRUMENTS: readonly SongCardInstrument[] = [];

export interface SongCardView<Status extends string> {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly instruments: readonly SongCardInstrument[];
  readonly deezerAlbumId: string | null;
  readonly status: Status;
  readonly chartKind: ChartKindTag;
}

// @FollowsBlueprint core-view-projection
export function toSongCard<Status extends string>(
  song: SongCardSource<Status>,
  detail: string,
  instruments: readonly SongCardInstrument[] = NO_CARD_INSTRUMENTS,
): SongCardView<Status> {
  return {
    id: song.id,
    title: song.title,
    detail,
    instruments,
    deezerAlbumId: song.deezerAlbumId,
    status: song.status,
    chartKind: extractChartKind(song.charts[0]),
  };
}

export interface LearnedInstrument {
  readonly id: string;
  readonly name: string;
  readonly icon: InstrumentIcon;
}

export interface SongToLearnDetail {
  readonly instruments: readonly SongCardInstrument[];
  readonly detail: string;
}

function describeLowestScore(lowestScore: number | null, isAfterGlyphs: boolean): string {
  if (lowestScore === null) return '';
  const score = `${lowestScore}/${MASTERY_SCALE}`;
  return isAfterGlyphs ? `${SCORE_AFTER_GLYPHS_PREFIX}${score}` : score;
}

// @FollowsBlueprint core-view-projection
export function describeSongToLearn(
  entry: SongToLearn<unknown>,
  instrumentsById: ReadonlyMap<string, LearnedInstrument>,
): SongToLearnDetail {
  const learned = entry.instrumentIds.flatMap((instrumentId) => {
    const instrument = instrumentsById.get(instrumentId);
    return instrument === undefined ? [] : [instrument];
  });
  const namedInWords = selectInstrumentIdsNamedInWords(learned);
  return {
    instruments: learned.map((instrument) => ({
      instrumentId: instrument.id,
      name: instrument.name,
      icon: instrument.icon,
      isNameNeeded: namedInWords.has(instrument.id),
    })),
    detail: describeLowestScore(entry.lowestScore, learned.length > 0),
  };
}

export type CatalogEmptyMessageKey =
  | 'catalog.emptyList'
  | 'catalog.emptySearch'
  | 'catalog.emptyToLearn';

export function selectCatalogEmptyMessageKey(
  search: string,
  filter: CatalogFilter,
): CatalogEmptyMessageKey {
  if (search.trim().length > 0) return 'catalog.emptySearch';
  return filter === TO_LEARN_FILTER ? 'catalog.emptyToLearn' : 'catalog.emptyList';
}
