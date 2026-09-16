/**
 * @DependsOnExternal openstreetmap-nominatim
 */

import {
  type BarSearchCacheEntry,
  type BarSearchHit,
  expiredBarSearchCacheKeys,
  mapNominatimToBarSearchHits,
} from './bar-search.core';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_USER_AGENT = 'Pragma/1.0 (https://pragma.borso.fr)';
const SEARCH_CACHE_TTL_MS = 3_600_000;
const SEARCH_MIN_INTERVAL_MS = 1_000;
const SEARCH_RESULT_LIMIT = 10;

export type PlacesFetcher = (url: string, init: RequestInit) => Promise<Response>;

export interface BarSearchState {
  readonly cache: Map<string, BarSearchCacheEntry>;
  lastCallAt: number;
}

const barSearchState: BarSearchState = { cache: new Map(), lastCallAt: 0 };

export interface SearchPlacesOptions {
  readonly fetcher?: PlacesFetcher;
  readonly now?: () => number;
  readonly state?: BarSearchState;
}

function evictExpired(state: BarSearchState, nowMillis: number): void {
  for (const cacheKey of expiredBarSearchCacheKeys(state.cache, nowMillis)) {
    state.cache.delete(cacheKey);
  }
}

async function waitForRateSlot(state: BarSearchState, now: () => number): Promise<void> {
  const elapsed = now() - state.lastCallAt;
  if (elapsed >= SEARCH_MIN_INTERVAL_MS) return;
  await new Promise<void>((resolve) => {
    setTimeout(resolve, SEARCH_MIN_INTERVAL_MS - elapsed);
  });
}

function buildSearchUrl(query: string): string {
  const parameters = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    addressdetails: '1',
    extratags: '1',
    namedetails: '0',
    limit: String(SEARCH_RESULT_LIMIT),
  });
  return `${NOMINATIM_BASE_URL}?${parameters.toString()}`;
}

// @FollowsBlueprint adapter-rate-limited-fetch
export async function searchPlacesForBars(
  query: string,
  options: SearchPlacesOptions = {},
): Promise<BarSearchHit[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];
  const state = options.state ?? barSearchState;
  const now = options.now ?? Date.now;
  const fetcher = options.fetcher ?? fetch;
  const cacheKey = trimmed.toLowerCase();
  evictExpired(state, now());
  const cached = state.cache.get(cacheKey);
  if (cached !== undefined) return [...cached.value];
  await waitForRateSlot(state, now);
  state.lastCallAt = now();
  const response = await fetcher(buildSearchUrl(trimmed), {
    headers: { 'User-Agent': NOMINATIM_USER_AGENT, Accept: 'application/json' },
  });
  if (!response.ok) return [];
  const nominatimBody: unknown = await response.json();
  const hits = mapNominatimToBarSearchHits(nominatimBody);
  state.cache.set(cacheKey, { value: [...hits], expiresAt: now() + SEARCH_CACHE_TTL_MS });
  return [...hits];
}
