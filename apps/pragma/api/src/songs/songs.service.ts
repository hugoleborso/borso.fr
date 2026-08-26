import type { z } from 'zod';
import {
  type ExternalSongHit,
  normalizeSearchQuery,
  readCachedSearchHits,
} from './musicbrainz.core';
import {
  lookupExternalRecording,
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
  const normalizedQuery = normalizeSearchQuery(params.query);
  if (normalizedQuery.length === 0) return { kind: 'ok', hits: [] };
  const cachedHits = await findFreshCachedSearch(normalizedQuery, params.now);
  if (cachedHits !== null) return { kind: 'ok', hits: readCachedSearchHits(cachedHits) };
  const outcome = await searchExternal(params.query, params.options ?? {});
  if (outcome.kind === 'unavailable') return outcome;
  await upsertCachedSearch({
    normalizedQuery,
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
