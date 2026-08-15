/**
 * The books context's way out of the process, and the only file in it that
 * makes a network call. Per ADR-0012 an outbound call lives in an
 * `.adapter.ts` and nowhere else.
 *
 * Two guards live here rather than in the service, because both belong to
 * OpenLibrary's contract rather than to anything a reader does: a 60 s
 * response cache keyed by the lowercased query, and a one-second floor
 * between outbound calls, which is the rate the service asks unauthenticated
 * clients to keep. Both reset on a Lambda cold start, which is fine — the
 * limit is per address and the cache only softens load for a warm container.
 *
 * The fetcher, the clock and the cache all arrive as options, so the whole
 * file is drivable from a test with no network and no real timer.
 *
 * @DependsOnExternal openlibrary
 */

import {
  type BookLookupHit,
  buildLookupCacheKey,
  type LookupCacheEntry,
  listExpiredLookupCacheKeys,
  mapOpenLibraryDocuments,
} from './openlibrary.core';

const OPENLIBRARY_SEARCH_URL = 'https://openlibrary.org/search.json';
const OPENLIBRARY_USER_AGENT = 'Borsolivres/1.0 (https://borsolivres.borso.fr)';
const LOOKUP_CACHE_TTL_MS = 60_000;
const LOOKUP_MINIMUM_INTERVAL_MS = 1_000;
/** Enough rows to choose from without paging, which the panel does not offer. */
const LOOKUP_RESULT_LIMIT = 20;
/**
 * The endpoint returns roughly forty fields per work by default, most of them
 * lists of identifiers nothing here reads. Naming the fields keeps the payload
 * small enough that a warm Lambda parses it in single-digit milliseconds.
 */
const LOOKUP_FIELDS = 'key,title,author_name,first_publish_year,isbn,cover_i,edition_count';

const NO_ELAPSED_TIME = 0;

export type LookupFetcher = (url: string, init: RequestInit) => Promise<Response>;

export interface LookupState {
  readonly cache: Map<string, LookupCacheEntry>;
  lastCallAt: number;
}

const moduleLookupState: LookupState = {
  cache: new Map(),
  lastCallAt: NO_ELAPSED_TIME,
};

export function buildLookupState(): LookupState {
  return { cache: new Map(), lastCallAt: NO_ELAPSED_TIME };
}

function evictExpired(state: LookupState, nowMillis: number): void {
  for (const cacheKey of listExpiredLookupCacheKeys(state.cache, nowMillis)) {
    state.cache.delete(cacheKey);
  }
}

async function waitForRateSlot(state: LookupState, readClock: () => number): Promise<void> {
  const elapsed = readClock() - state.lastCallAt;
  if (elapsed >= LOOKUP_MINIMUM_INTERVAL_MS) return;
  const waitMillis = LOOKUP_MINIMUM_INTERVAL_MS - elapsed;
  await new Promise<void>((resolve) => {
    setTimeout(resolve, waitMillis);
  });
}

function buildSearchUrl(query: string): string {
  const parameters = new URLSearchParams({
    q: query,
    limit: String(LOOKUP_RESULT_LIMIT),
    fields: LOOKUP_FIELDS,
  });
  return `${OPENLIBRARY_SEARCH_URL}?${parameters.toString()}`;
}

export interface LookupOptions {
  readonly fetcher?: LookupFetcher;
  readonly readClock?: () => number;
  readonly state?: LookupState;
}

/**
 * The books OpenLibrary knows about under a free-text query.
 *
 * A non-ok response yields an empty list rather than throwing, because a
 * lookup that fails upstream is not something the reader filling in a form can
 * act on, and the form still works without it.
 */
// @FollowsBlueprint adapter-rate-limited-fetch
export async function listOpenLibraryMatches(
  query: string,
  options: LookupOptions = {},
): Promise<readonly BookLookupHit[]> {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length === 0) return [];
  const state = options.state ?? moduleLookupState;
  const readClock = options.readClock ?? Date.now;
  const fetcher = options.fetcher ?? fetch;
  const cacheKey = buildLookupCacheKey(trimmedQuery);
  evictExpired(state, readClock());
  const cached = state.cache.get(cacheKey);
  if (cached !== undefined) return cached.value;
  await waitForRateSlot(state, readClock);
  state.lastCallAt = readClock();
  const response = await fetcher(buildSearchUrl(trimmedQuery), {
    headers: { 'User-Agent': OPENLIBRARY_USER_AGENT, Accept: 'application/json' },
  });
  if (!response.ok) return [];
  const searchPayload: unknown = await response.json();
  const hits = mapOpenLibraryDocuments(searchPayload);
  state.cache.set(cacheKey, { value: hits, expiresAt: readClock() + LOOKUP_CACHE_TTL_MS });
  return hits;
}
