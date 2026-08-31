/**
 * @DependsOnExternal musicbrainz
 */

import { type ExternalSongHit, mapMusicBrainzRecordings } from './musicbrainz.core';
import { rankExternalHits } from './search-ranking.core';

const MUSICBRAINZ_BASE_URL = 'https://musicbrainz.org/ws/2/recording/';
const MUSICBRAINZ_ISRC_URL = 'https://musicbrainz.org/ws/2/isrc/';
const MUSICBRAINZ_USER_AGENT = 'Pragma/1.0 (https://pragma.borso.fr)';
const EXTERNAL_SEARCH_MIN_INTERVAL_MS = 1_000;
const EXTERNAL_SEARCH_LIMIT = 25;
const EXTERNAL_SEARCH_PARSER = 'dismax=true';

export type ExternalFetcher = (url: string, init: RequestInit) => Promise<Response>;

export type ExternalSearchOutcome =
  | { readonly kind: 'ok'; readonly hits: ExternalSongHit[] }
  | { readonly kind: 'unavailable'; readonly status: number };

export interface ExternalSearchState {
  lastCallAt: number;
}

const externalSearchState: ExternalSearchState = { lastCallAt: 0 };

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
 * @BlueprintDescription Holds the last-call timestamp in module state so a warm instance keeps self-throttling, takes the fetcher and the clock as options so a test drives them without a network or a timer, and returns the domain's own type by handing the payload to the sibling `.core.ts` rather than exposing the vendor's shape. A non-ok response returns the `unavailable` arm of a union carrying the status, because a search that was throttled is not the same answer as a search that found nothing, and a caller that cannot tell them apart shows an empty list for a reason nobody can see. Caching is deliberately not here: it belongs to a table the whole stage shares, since a module-level cache warms once per instance.
 * @DependsOnExternal musicbrainz
 */
export async function searchExternal(
  query: string,
  options: SearchExternalOptions = {},
): Promise<ExternalSearchOutcome> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return { kind: 'ok', hits: [] };
  const state = options.state ?? externalSearchState;
  const now = options.now ?? Date.now;
  const fetcher = options.fetcher ?? fetch;
  await waitForRateSlot(state, now);
  state.lastCallAt = now();
  const url = `${MUSICBRAINZ_BASE_URL}?query=${encodeURIComponent(trimmed)}&fmt=json&limit=${EXTERNAL_SEARCH_LIMIT}&${EXTERNAL_SEARCH_PARSER}&inc=tags+releases+isrcs`;
  const response = await fetcher(url, {
    headers: { 'User-Agent': MUSICBRAINZ_USER_AGENT, Accept: 'application/json' },
  });
  if (!response.ok) return { kind: 'unavailable', status: response.status };
  const body: unknown = await response.json();
  return { kind: 'ok', hits: [...rankExternalHits(mapMusicBrainzRecordings(body), trimmed)] };
}

// @FollowsBlueprint adapter-rate-limited-fetch
export async function lookupExternalRecordingsByIsrc(
  isrc: string,
  options: SearchExternalOptions = {},
): Promise<ExternalSearchOutcome> {
  const state = options.state ?? externalSearchState;
  const now = options.now ?? Date.now;
  const fetcher = options.fetcher ?? fetch;
  await waitForRateSlot(state, now);
  state.lastCallAt = now();
  const url = `${MUSICBRAINZ_ISRC_URL}${encodeURIComponent(isrc)}?fmt=json&inc=artist-credits+tags+isrcs`;
  const response = await fetcher(url, {
    headers: { 'User-Agent': MUSICBRAINZ_USER_AGENT, Accept: 'application/json' },
  });
  if (!response.ok) return { kind: 'unavailable', status: response.status };
  const body: unknown = await response.json();
  return { kind: 'ok', hits: mapMusicBrainzRecordings(body) };
}
