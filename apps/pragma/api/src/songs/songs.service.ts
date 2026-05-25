/**
 * Service layer for songs. The external-search method (MusicBrainz
 * proxy) keeps two in-execution-context guards: a 60s response cache
 * keyed by the lowercased query and a 1 req/sec floor between
 * outbound calls. Both reset on Lambda cold start, which is fine —
 * MusicBrainz' rate limit is per-IP and the cache only softens load
 * for a warm instance.
 */

import type { Database } from '../database/client';
import { type GetSongBpmHit, parseGetSongBpmResponse } from './getsongbpm.core';
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
    bpm: input.bpm,
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
const GETSONGBPM_BASE_URL = 'https://api.getsongbpm.com/search/';
const GETSONGBPM_API_KEY_ENV = 'GETSONGBPM_API_KEY';
// We only enrich the top hit with GetSongBPM to keep search latency
// bounded — the 1 req/sec global rate floor means hydrating every
// MusicBrainz hit (up to 10) would add ~10s to every typeahead.
const GETSONGBPM_ENRICH_LIMIT = 1;

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

interface GetSongBpmCacheEntry {
  readonly value: GetSongBpmHit | null;
  readonly expiresAt: number;
}

interface GetSongBpmState {
  readonly cache: Map<string, GetSongBpmCacheEntry>;
  lastCallAt: number;
}

const getSongBpmState: GetSongBpmState = {
  cache: new Map(),
  lastCallAt: 0,
};

function evictGetSongBpmExpired(state: GetSongBpmState, now: number): void {
  for (const [key, entry] of state.cache) {
    if (entry.expiresAt <= now) state.cache.delete(key);
  }
}

async function waitForGetSongBpmSlot(
  state: GetSongBpmState,
  now: () => number,
): Promise<void> {
  const elapsed = now() - state.lastCallAt;
  if (elapsed >= EXTERNAL_SEARCH_MIN_INTERVAL_MS) return;
  const waitMs = EXTERNAL_SEARCH_MIN_INTERVAL_MS - elapsed;
  await new Promise<void>((resolve) => {
    setTimeout(resolve, waitMs);
  });
}

export interface EnrichGetSongBpmOptions {
  readonly fetcher?: ExternalFetcher;
  readonly now?: () => number;
  readonly state?: GetSongBpmState;
  readonly env?: Readonly<Record<string, string | undefined>>;
}

export interface EnrichGetSongBpmInput {
  readonly artist: string;
  readonly title: string;
}

export async function enrichFromGetSongBpm(
  input: EnrichGetSongBpmInput,
  options: EnrichGetSongBpmOptions = {},
): Promise<GetSongBpmHit | null> {
  const env = options.env ?? process.env;
  const apiKey = env[GETSONGBPM_API_KEY_ENV];
  if (apiKey === undefined || apiKey.length === 0) return null;
  const artist = input.artist.trim();
  const title = input.title.trim();
  if (title.length === 0) return null;
  const state = options.state ?? getSongBpmState;
  const now = options.now ?? Date.now;
  const fetcher = options.fetcher ?? fetch;
  const cacheKey = `${artist.toLowerCase()}|${title.toLowerCase()}`;
  evictGetSongBpmExpired(state, now());
  const cached = state.cache.get(cacheKey);
  if (cached !== undefined) return cached.value;
  await waitForGetSongBpmSlot(state, now);
  state.lastCallAt = now();
  const lookupValue = `song:${title} artist:${artist}`;
  const url = `${GETSONGBPM_BASE_URL}?api_key=${encodeURIComponent(apiKey)}&type=both&lookup=${encodeURIComponent(lookupValue)}`;
  let response: Response;
  try {
    response = await fetcher(url, { headers: { Accept: 'application/json' } });
  } catch {
    // Secondary lookup is best-effort: a network failure must never
    // break the primary MusicBrainz search.
    state.cache.set(cacheKey, { value: null, expiresAt: now() + EXTERNAL_SEARCH_CACHE_TTL_MS });
    return null;
  }
  if (!response.ok) {
    state.cache.set(cacheKey, { value: null, expiresAt: now() + EXTERNAL_SEARCH_CACHE_TTL_MS });
    return null;
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    state.cache.set(cacheKey, { value: null, expiresAt: now() + EXTERNAL_SEARCH_CACHE_TTL_MS });
    return null;
  }
  const hit = parseGetSongBpmResponse(payload);
  state.cache.set(cacheKey, { value: hit, expiresAt: now() + EXTERNAL_SEARCH_CACHE_TTL_MS });
  return hit;
}

function applyGetSongBpmEnrichment(
  hit: ExternalSongHit,
  enrichment: GetSongBpmHit | null,
): ExternalSongHit {
  if (enrichment === null) return hit;
  return {
    ...hit,
    tonality: enrichment.tonality,
    bpm: enrichment.bpm,
    // Don't overwrite a MusicBrainz-supplied duration; only fill the
    // gap when MB itself had nothing.
    durationSeconds: hit.durationSeconds ?? enrichment.durationSeconds,
  };
}

export interface SearchExternalEnrichmentOptions {
  readonly fetcher?: ExternalFetcher;
  readonly now?: () => number;
  readonly state?: GetSongBpmState;
  readonly env?: Readonly<Record<string, string | undefined>>;
}

export interface SearchExternalFullOptions extends SearchExternalOptions {
  readonly getSongBpm?: SearchExternalEnrichmentOptions;
}

export async function searchExternal(
  query: string,
  options: SearchExternalFullOptions = {},
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
  const enrichedHits = await enrichTopHitsWithGetSongBpm(hits, options.getSongBpm);
  state.cache.set(cacheKey, {
    value: enrichedHits,
    expiresAt: now() + EXTERNAL_SEARCH_CACHE_TTL_MS,
  });
  return enrichedHits;
}

async function enrichTopHitsWithGetSongBpm(
  hits: ExternalSongHit[],
  enrichOptions: SearchExternalEnrichmentOptions | undefined,
): Promise<ExternalSongHit[]> {
  const env = enrichOptions?.env ?? process.env;
  const apiKey = env[GETSONGBPM_API_KEY_ENV];
  if (apiKey === undefined || apiKey.length === 0) return hits;
  const result: ExternalSongHit[] = [];
  for (let index = 0; index < hits.length; index += 1) {
    const hit = hits[index];
    if (hit === undefined) continue;
    if (index >= GETSONGBPM_ENRICH_LIMIT) {
      result.push(hit);
      continue;
    }
    const enrichment = await enrichFromGetSongBpm(
      { artist: hit.artist, title: hit.title },
      {
        ...(enrichOptions?.fetcher !== undefined ? { fetcher: enrichOptions.fetcher } : {}),
        ...(enrichOptions?.now !== undefined ? { now: enrichOptions.now } : {}),
        ...(enrichOptions?.state !== undefined ? { state: enrichOptions.state } : {}),
        env,
      },
    );
    result.push(applyGetSongBpmEnrichment(hit, enrichment));
  }
  return result;
}
