import type { z } from 'zod';
import { type ExternalSongHit, readCachedSearchHits } from './musicbrainz.core';
import { type AudienceSongHit, readCachedAudienceHits } from './deezer.core';
import { findCatalogueMatch } from './song-identity.core';
import { type DeezerOptions, readDeezerTrack, searchDeezerTracks } from './deezer.adapter';
import { buildSearchCacheKey } from './search-cache.core';
import {
  lookupExternalRecording,
  lookupExternalRecordingsByIsrc,
  searchExternal,
  type SearchExternalOptions,
} from './musicbrainz.adapter';
import { findFreshCachedSearch, upsertCachedSearch } from './search-cache.repository';
import type { DeletionOutcome } from '../helpers/persistence/deletion.core';
export type { SongRow } from './songs.repository';
import {
  deleteSongWithCascade,
  findSongById,
  insertSong,
  listSongsNewestFirst,
  type SongInsertShape,
  type SongRow,
  updateSong,
} from './songs.repository';
import type { songCreateInputSchema, songUpdateInputSchema } from './songs.schema';

type SongCreateInput = z.infer<typeof songCreateInputSchema>;
type SongUpdateInput = z.infer<typeof songUpdateInputSchema>;

function valuesFromCreate(input: SongCreateInput): SongInsertShape {
  return {
    title: input.title,
    artist: input.artist,
    status: input.status,
    links: input.links,
    chart: input.chart,
    tonalityStart: input.tonalityStart,
    tonalityEnd: input.tonalityEnd,
    defaultLineup: input.defaultLineup,
    baseEnergy: input.baseEnergy,
    mbid: input.mbid,
    album: input.album,
    durationSeconds: input.durationSeconds,
    isrcs: input.isrcs,
    tags: input.tags,
    structureNotes: input.structureNotes,
    gimmickNotes: input.gimmickNotes,
    notes: input.notes,
  };
}

export async function getSongs(): Promise<SongRow[]> {
  return await listSongsNewestFirst();
}

export async function getSongById(id: string): Promise<SongRow | null> {
  return await findSongById(id);
}

export async function createSong(input: SongCreateInput): Promise<SongRow> {
  return await insertSong(valuesFromCreate(input));
}

// @FollowsBlueprint service-crud-update
export async function patchSong(
  id: string,
  input: SongUpdateInput,
): Promise<{ kind: 'ok'; song: SongRow } | { kind: 'empty' } | { kind: 'not-found' }> {
  if (Object.keys(input).length === 0) return { kind: 'empty' };
  const song = await updateSong(id, input);
  if (song === null) return { kind: 'not-found' };
  return { kind: 'ok', song };
}

export async function removeSong(id: string): Promise<DeletionOutcome> {
  return await deleteSongWithCascade(id);
}

export const EXTERNAL_SEARCH_CACHE_TTL_MS = 60_000;

export type SongSearchOutcome =
  { kind: 'ok'; hits: ExternalSongHit[] } | { kind: 'unavailable'; status: number };

export interface SearchSongsParams {
  readonly query: string;
  readonly now: Date;
  readonly options?: SearchExternalOptions;
}

// @FollowsBlueprint service-orchestration
export async function searchExternalSongs(params: SearchSongsParams): Promise<SongSearchOutcome> {
  if (params.query.trim().length === 0) return { kind: 'ok', hits: [] };
  const cacheKey = buildSearchCacheKey('musicbrainz', params.query);
  const cachedHits = await findFreshCachedSearch(cacheKey, params.now);
  if (cachedHits !== null) return { kind: 'ok', hits: readCachedSearchHits(cachedHits) };
  const outcome = await searchExternal(params.query, params.options ?? {});
  if (outcome.kind === 'unavailable') return outcome;
  await upsertCachedSearch({
    normalizedQuery: cacheKey,
    hits: outcome.hits,
    expiresAt: new Date(params.now.getTime() + EXTERNAL_SEARCH_CACHE_TTL_MS),
  }).catch(() => undefined);
  return { kind: 'ok', hits: outcome.hits };
}

// @FollowsBlueprint service-passthrough
export async function lookupExternalSong(
  musicBrainzId: string,
  options: SearchExternalOptions = {},
): Promise<SongSearchOutcome> {
  return await lookupExternalRecording(musicBrainzId, options);
}

export type AudienceSearchOutcome =
  { kind: 'ok'; hits: AudienceSongHit[] } | { kind: 'unavailable'; status: number };

export interface SearchAudienceSongsParams {
  readonly query: string;
  readonly now: Date;
  readonly options?: DeezerOptions;
}

// @FollowsBlueprint service-orchestration
export async function searchAudienceSongs(
  params: SearchAudienceSongsParams,
): Promise<AudienceSearchOutcome> {
  if (params.query.trim().length === 0) return { kind: 'ok', hits: [] };
  const cacheKey = buildSearchCacheKey('deezer', params.query);
  const cachedHits = await findFreshCachedSearch(cacheKey, params.now);
  if (cachedHits !== null) return { kind: 'ok', hits: readCachedAudienceHits(cachedHits) };
  const outcome = await searchDeezerTracks(params.query, params.options ?? {});
  if (outcome.kind === 'unavailable') return outcome;
  await upsertCachedSearch({
    normalizedQuery: cacheKey,
    hits: outcome.hits,
    expiresAt: new Date(params.now.getTime() + EXTERNAL_SEARCH_CACHE_TTL_MS),
  }).catch(() => undefined);
  return { kind: 'ok', hits: outcome.hits };
}

interface ResolvedRecording {
  readonly mbid: string | null;
  readonly isrcs: readonly string[];
  readonly tags: readonly string[];
}

const UNRESOLVED_RECORDING: ResolvedRecording = { mbid: null, isrcs: [], tags: [] };

async function resolveRecordingOfTrack(track: AudienceSongHit): Promise<ResolvedRecording> {
  if (track.isrc === null) return UNRESOLVED_RECORDING;
  const withIsrcOnly: ResolvedRecording = { ...UNRESOLVED_RECORDING, isrcs: [track.isrc] };
  const outcome = await lookupExternalRecordingsByIsrc(track.isrc);
  if (outcome.kind === 'unavailable') return withIsrcOnly;
  const recording = outcome.hits[0];
  if (recording === undefined) return withIsrcOnly;
  return { mbid: recording.mbid, isrcs: recording.isrcs, tags: recording.tags };
}

async function importSuggestedSong(
  track: AudienceSongHit,
  recording: ResolvedRecording,
): Promise<SongRow> {
  return await createSong({
    title: track.title,
    artist: track.artist,
    status: 'idea',
    links: [],
    chart: null,
    tonalityStart: null,
    tonalityEnd: null,
    defaultLineup: {},
    baseEnergy: null,
    mbid: recording.mbid,
    album: track.album,
    durationSeconds: track.durationSeconds,
    isrcs: [...recording.isrcs],
    tags: [...recording.tags],
    structureNotes: '',
    gimmickNotes: '',
    notes: '',
  });
}

export type TrackResolution =
  { kind: 'ok'; song: SongRow } | { kind: 'unknown' } | { kind: 'unavailable' };

// @FollowsBlueprint service-orchestration
export async function resolveCatalogueSongForTrack(trackId: string): Promise<TrackResolution> {
  const read = await readDeezerTrack(trackId);
  if (read.kind === 'unavailable') return { kind: 'unavailable' };
  if (read.kind === 'unknown') return { kind: 'unknown' };
  const recording = await resolveRecordingOfTrack(read.track);
  const known = findCatalogueMatch(await getSongs(), {
    mbid: recording.mbid,
    title: read.track.title,
    artist: read.track.artist,
  });
  if (known !== null) return { kind: 'ok', song: known };
  return { kind: 'ok', song: await importSuggestedSong(read.track, recording) };
}
