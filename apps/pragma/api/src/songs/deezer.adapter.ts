/**
 * @DependsOnExternal deezer
 */

import {
  DEEZER_QUOTA_ERROR_CODE,
  type ExternalSearchCacheEntry,
  expiredSearchCacheKeys,
  type ExternalSongHit,
  mapDeezerTrack,
  mapDeezerTracks,
  readDeezerErrorCode,
} from './deezer.core';
import { rankExternalHits } from './search-ranking.core';

const DEEZER_SEARCH_URL = 'https://api.deezer.com/search';
const DEEZER_TRACK_URL = 'https://api.deezer.com/track/';
const EXTERNAL_SEARCH_CACHE_TTL_MS = 60_000;
const EXTERNAL_SEARCH_MIN_INTERVAL_MS = 100;
const EXTERNAL_SEARCH_LIMIT = 25;

export type ExternalFetcher = (url: string, init: RequestInit) => Promise<Response>;

export interface ExternalSearchState {
  readonly cache: Map<string, ExternalSearchCacheEntry>;
  lastCallAt: number;
}

const externalSearchState: ExternalSearchState = {
  cache: new Map(),
  lastCallAt: 0,
};

function evictExpired(state: ExternalSearchState, now: number): void {
  for (const cacheKey of expiredSearchCacheKeys(state.cache, now)) {
    state.cache.delete(cacheKey);
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

export type ExternalSearchOutcome =
  { readonly kind: 'ok'; readonly hits: ExternalSongHit[] } | { readonly kind: 'unavailable' };

export type TrackReadOutcome =
  | { readonly kind: 'ok'; readonly track: ExternalSongHit }
  | { readonly kind: 'unknown' }
  | { readonly kind: 'unavailable' };

interface DeezerRead {
  readonly wasAnswered: boolean;
  readonly body: unknown;
}

const NOTHING_READ = null;

async function readDeezer(url: string, options: SearchExternalOptions): Promise<DeezerRead> {
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) return { wasAnswered: false, body: NOTHING_READ };
  const body: unknown = await response.json();
  if (readDeezerErrorCode(body) === DEEZER_QUOTA_ERROR_CODE) {
    return { wasAnswered: false, body };
  }
  return { wasAnswered: true, body };
}

/**
 * @Blueprint adapter-rate-limited-fetch
 * @BlueprintName Adapter Over A Rate-Limited Web Service
 * @BlueprintUsage Use for the one file in a bounded context that calls a third-party HTTP service with a published rate limit.
 * @BlueprintDescription Holds the cache and the last-call timestamp in module state so a warm instance reuses both, takes the fetcher and the clock as options so a test drives them without a network or a timer, and returns the domain's own type by handing the payload to the sibling `.core.ts` rather than exposing the vendor's shape. A refusal returns the `unavailable` arm of a union rather than an empty list, because a search that was throttled is not a search that found nothing and a caller that cannot tell them apart shows an empty dropdown for a reason nobody can see. This service states some refusals inside a 200 body, so the status alone is not the answer: both are read through one private helper the two calls share.
 * @DependsOnExternal deezer
 */
export async function searchExternal(
  query: string,
  options: SearchExternalOptions = {},
): Promise<ExternalSearchOutcome> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return { kind: 'ok', hits: [] };
  const state = options.state ?? externalSearchState;
  const now = options.now ?? Date.now;
  const cacheKey = trimmed.toLowerCase();
  evictExpired(state, now());
  const cached = state.cache.get(cacheKey);
  if (cached !== undefined) return { kind: 'ok', hits: [...cached.value] };
  await waitForRateSlot(state, now);
  state.lastCallAt = now();
  const url = `${DEEZER_SEARCH_URL}?q=${encodeURIComponent(trimmed)}&limit=${String(EXTERNAL_SEARCH_LIMIT)}`;
  const read = await readDeezer(url, options);
  if (!read.wasAnswered) return { kind: 'unavailable' };
  const hits = rankExternalHits(mapDeezerTracks(read.body), trimmed);
  state.cache.set(cacheKey, { value: [...hits], expiresAt: now() + EXTERNAL_SEARCH_CACHE_TTL_MS });
  return { kind: 'ok', hits: [...hits] };
}

// @FollowsBlueprint adapter-rate-limited-fetch
export async function readDeezerTrack(
  trackId: string,
  options: SearchExternalOptions = {},
): Promise<TrackReadOutcome> {
  const state = options.state ?? externalSearchState;
  const now = options.now ?? Date.now;
  await waitForRateSlot(state, now);
  state.lastCallAt = now();
  const read = await readDeezer(`${DEEZER_TRACK_URL}${encodeURIComponent(trackId)}`, options);
  if (!read.wasAnswered) return { kind: 'unavailable' };
  const track = mapDeezerTrack(read.body);
  if (track === null) return { kind: 'unknown' };
  return { kind: 'ok', track };
}
