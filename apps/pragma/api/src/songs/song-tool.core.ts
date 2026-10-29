import { foldReferenceText, type ReferenceCandidate } from '../helpers/reference/reference.core';
import { type LineupNames, nameLineup } from '../instruments/lineup-names.core';
import type { SongRow, SongStatus } from './songs.repository';

export interface SongFilter {
  readonly query?: string | undefined;
  readonly status?: SongStatus | undefined;
}

export interface SongSummary {
  readonly id: string;
  readonly title: string;
  readonly artist: string;
  readonly status: SongStatus;
  readonly tonality: string | null;
}

const TONALITY_ARROW = '→';

export function describeTonality(start: string | null, end: string | null): string | null {
  if (start === null) return end;
  return end === null || end === start ? start : `${start}${TONALITY_ARROW}${end}`;
}

export function listSongCandidates(songs: readonly SongRow[]): ReferenceCandidate[] {
  return songs.map((song) => ({ id: song.id, label: song.title, hint: song.artist }));
}

function isSongKept(song: SongRow, filter: SongFilter): boolean {
  const isStatusKept = filter.status === undefined || song.status === filter.status;
  const query = foldReferenceText(filter.query ?? '');
  const searched = foldReferenceText(`${song.title} ${song.artist}`);
  return isStatusKept && searched.includes(query);
}

// @FollowsBlueprint core-projection
export function summarizeSongs(songs: readonly SongRow[], filter: SongFilter): SongSummary[] {
  return songs
    .filter((song) => isSongKept(song, filter))
    .map((song) => ({
      id: song.id,
      title: song.title,
      artist: song.artist,
      status: song.status,
      tonality: describeTonality(song.tonalityStart, song.tonalityEnd),
    }))
    .toSorted((left, right) => left.title.localeCompare(right.title));
}

function keepFilledList<Item>(values: readonly Item[]): readonly Item[] | undefined {
  return values.length > 0 ? values : undefined;
}

// @FollowsBlueprint core-projection
export function projectSongForTool(song: SongRow, names: LineupNames, isDetailed: boolean) {
  const view = {
    id: song.id,
    title: song.title,
    artist: song.artist,
    status: song.status,
    origin: song.origin,
    tonality: describeTonality(song.tonalityStart, song.tonalityEnd),
    energy: song.baseEnergy,
    durationSeconds: song.durationSeconds,
    lineup: nameLineup(song.defaultLineup, names),
    tags: keepFilledList(song.tags),
    structureNotes: song.structureNotes,
    gimmickNotes: song.gimmickNotes,
    notes: song.notes,
    chart: song.chart?.kind ?? null,
  };
  if (!isDetailed) return view;
  return {
    ...view,
    chart: song.chart,
    links: keepFilledList(song.links),
    album: song.album,
    deezerTrackId: song.deezerTrackId,
    spotifyTrackId: song.spotifyTrackId,
    isrcs: keepFilledList(song.isrcs),
  };
}
