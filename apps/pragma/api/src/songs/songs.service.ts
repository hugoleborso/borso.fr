/**
 * Service layer for songs. The external-search method (MusicBrainz
 * proxy) keeps two in-execution-context guards: a 60s response cache
 * keyed by the lowercased query and a 1 req/sec floor between
 * outbound calls. Both reset on Lambda cold start, which is fine —
 * MusicBrainz' rate limit is per-IP and the cache only softens load
 * for a warm instance.
 */

import type { Database } from '../database/client';
import { type ExternalSongHit, mapMusicBrainzRecordings } from './musicbrainz.core';
import {
  type SongInsertShape,
  type SongRow,
  deleteSongWithCascade,
  findSongById,
  insertSong,
  listSongsNewestFirst,
  updateSong,
} from './songs.repository';
import type { songCreateInputSchema, songUpdateInputSchema } from './songs.schema';
import type { z } from 'zod';

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
  };
}

export async function getSongs(database: Database): Promise<SongRow[]> {
  return await listSongsNewestFirst(database);
}

export async function getSongById(database: Database, id: string): Promise<SongRow | null> {
  return await findSongById(database, id);
}

export async function createSong(database: Database, input: SongCreateInput): Promise<SongRow> {
  return await insertSong(database, valuesFromCreate(input));
}

export async function patchSong(
  database: Database,
  id: string,
  input: SongUpdateInput,
): Promise<{ kind: 'ok'; song: SongRow } | { kind: 'empty' } | { kind: 'not-found' }> {
  if (Object.keys(input).length === 0) return { kind: 'empty' };
  const song = await updateSong(database, id, input);
  if (song === null) return { kind: 'not-found' };
  return { kind: 'ok', song };
}

export async function removeSong(database: Database, id: string): Promise<boolean> {
  return await deleteSongWithCascade(database, id);
}

const MUSICBRAINZ_BASE_URL = 'https://musicbrainz.org/ws/2/recording/';
const MUSICBRAINZ_USER_AGENT = 'Pragma/1.0 (https://pragma.borso.fr)';
const EXTERNAL_SEARCH_CACHE_TTL_MS = 60_000;
const EXTERNAL_SEARCH_MIN_INTERVAL_MS = 1_000;
const EXTERNAL_SEARCH_LIMIT = 10;

export type ExternalFetcher = (url: string, init: RequestInit) => Promise<Response>;

interface CacheEntry {
  readonly value: ExternalSongHit[];
  readonly expiresAt: number;
}

interface ExternalSearchState {
  readonly cache: Map<string, CacheEntry>;
  lastCallAt: number;
}

const externalSearchState: ExternalSearchState = {
  cache: new Map(),
  lastCallAt: 0,
};

function evictExpired(state: ExternalSearchState, now: number): void {
  for (const [key, entry] of state.cache) {
    if (entry.expiresAt <= now) state.cache.delete(key);
  }
}

async function waitForRateSlot(state: ExternalSearchState, now: () => number): Promise<void> {
  const elapsed = now() - state.lastCallAt;
  if (elapsed >= EXTERNAL_SEARCH_MIN_INTERVAL_MS) return;
  const waitMs = EXTERNAL_SEARCH_MIN_INTERVAL_MS - elapsed;
  await new Promise<void>((resolve) => {
    setTimeout(resolve, waitMs);
  });
}

export interface SearchExternalOptions {
  readonly fetcher?: ExternalFetcher;
  readonly now?: () => number;
  readonly state?: ExternalSearchState;
}

export async function searchExternal(
  query: string,
  options: SearchExternalOptions = {},
): Promise<ExternalSongHit[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];
  const state = options.state ?? externalSearchState;
  const now = options.now ?? Date.now;
  const fetcher = options.fetcher ?? fetch;
  const cacheKey = trimmed.toLowerCase();
  evictExpired(state, now());
  const cached = state.cache.get(cacheKey);
  if (cached !== undefined) return cached.value;
  await waitForRateSlot(state, now);
  state.lastCallAt = now();
  const url = `${MUSICBRAINZ_BASE_URL}?query=${encodeURIComponent(trimmed)}&fmt=json&limit=${EXTERNAL_SEARCH_LIMIT}&inc=tags+releases+isrcs`;
  const response = await fetcher(url, {
    headers: { 'User-Agent': MUSICBRAINZ_USER_AGENT, Accept: 'application/json' },
  });
  if (!response.ok) return [];
  const payload: unknown = await response.json();
  const hits = mapMusicBrainzRecordings(payload);
  state.cache.set(cacheKey, { value: hits, expiresAt: now() + EXTERNAL_SEARCH_CACHE_TTL_MS });
  return hits;
}
