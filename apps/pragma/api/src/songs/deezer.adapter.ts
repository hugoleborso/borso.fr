/**
 * @DependsOnExternal deezer
 */

import {
  type ExternalSearchCacheEntry,
  expiredSearchCacheKeys,
  type ExternalSongHit,
  mapDeezerTracks,
} from './deezer.core';
import { rankExternalHits } from './search-ranking.core';

const DEEZER_SEARCH_URL = 'https://api.deezer.com/search';
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

/**
 * @Blueprint adapter-rate-limited-fetch
 * @BlueprintName Adapter Over A Rate-Limited Web Service
 * @BlueprintUsage Use for the one file in a bounded context that calls a third-party HTTP service with a published rate limit.
 * @BlueprintDescription Holds the cache and the last-call timestamp in module state so a warm instance reuses both, takes the fetcher and the clock as options so a test drives them without a network or a timer, and returns the domain's own type by handing the payload to the sibling `.core.ts` rather than exposing the vendor's shape. A non-ok response yields an empty result rather than throwing, because a search that fails upstream is not an error the caller can act on.
 * @DependsOnExternal deezer
 */
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
  const url = `${DEEZER_SEARCH_URL}?q=${encodeURIComponent(trimmed)}&limit=${String(EXTERNAL_SEARCH_LIMIT)}`;
  const response = await fetcher(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) return [];
  const body: unknown = await response.json();
  const hits = rankExternalHits(mapDeezerTracks(body), trimmed);
  state.cache.set(cacheKey, { value: [...hits], expiresAt: now() + EXTERNAL_SEARCH_CACHE_TTL_MS });
  return [...hits];
}
