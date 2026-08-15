/**
 * The songs context's way out of the process, and the only file in it that
 * makes a network call. Per ADR-0012 an outbound call lives in an
 * `.adapter.ts` and nowhere else.
 *
 * Two guards live here rather than in the service, because both belong to
 * MusicBrainz' contract rather than to anything the band does: a 60s response
 * cache keyed by the lowercased query, and a 1 req/sec floor between outbound
 * calls. Both reset on Lambda cold start, which is fine — the rate limit is
 * per-IP and the cache only softens load for a warm instance.
 *
 * @DependsOnExternal musicbrainz
 */

import {
  type ExternalSearchCacheEntry,
  expiredSearchCacheKeys,
  type ExternalSongHit,
  mapMusicBrainzRecordings,
} from './musicbrainz.core';
import { rankExternalHits } from './search-ranking.core';

const MUSICBRAINZ_BASE_URL = 'https://musicbrainz.org/ws/2/recording/';
const MUSICBRAINZ_USER_AGENT = 'Pragma/1.0 (https://pragma.borso.fr)';
const EXTERNAL_SEARCH_CACHE_TTL_MS = 60_000;
const EXTERNAL_SEARCH_MIN_INTERVAL_MS = 1_000;
// Wide enough that the original survives the noise a free-text query
// pulls in; `rankExternalHits` is what narrows it back down.
const EXTERNAL_SEARCH_LIMIT = 25;
// MusicBrainz' default Lucene parser reads a search box entry as a strict
// field query and misses the recording entirely; dismax is its forgiving
// parser, built for exactly this input.
const EXTERNAL_SEARCH_PARSER = 'dismax=true';

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
 * @DependsOnExternal musicbrainz
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
  const url = `${MUSICBRAINZ_BASE_URL}?query=${encodeURIComponent(trimmed)}&fmt=json&limit=${EXTERNAL_SEARCH_LIMIT}&${EXTERNAL_SEARCH_PARSER}&inc=tags+releases+isrcs`;
  const response = await fetcher(url, {
    headers: { 'User-Agent': MUSICBRAINZ_USER_AGENT, Accept: 'application/json' },
  });
  if (!response.ok) return [];
  const body: unknown = await response.json();
  const hits = rankExternalHits(mapMusicBrainzRecordings(body), trimmed);
  state.cache.set(cacheKey, { value: [...hits], expiresAt: now() + EXTERNAL_SEARCH_CACHE_TTL_MS });
  return [...hits];
}
