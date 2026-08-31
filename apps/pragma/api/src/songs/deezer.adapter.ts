/**
 * @DependsOnExternal deezer
 */

import {
  type AudienceSongHit,
  collapseTracksSharingAnIsrc,
  DEEZER_QUOTA_ERROR_CODE,
  mapDeezerTrack,
  mapDeezerTracks,
  readDeezerErrorCode,
} from './deezer.core';

const DEEZER_SEARCH_URL = 'https://api.deezer.com/search';
const DEEZER_TRACK_URL = 'https://api.deezer.com/track/';
const DEEZER_SEARCH_LIMIT = 25;

export type DeezerFetcher = (url: string, init: RequestInit) => Promise<Response>;

export interface DeezerOptions {
  readonly fetcher?: DeezerFetcher;
}

export type DeezerSearchOutcome =
  | { readonly kind: 'ok'; readonly hits: AudienceSongHit[] }
  | { readonly kind: 'unavailable'; readonly status: number };

export type DeezerTrackOutcome =
  | { readonly kind: 'ok'; readonly track: AudienceSongHit }
  | { readonly kind: 'unknown' }
  | { readonly kind: 'unavailable'; readonly status: number };

const DEEZER_QUOTA_STATUS = 429;
const DEEZER_HEADERS = { Accept: 'application/json' };

interface DeezerRead {
  readonly refusedWithStatus: number | null;
  readonly body: unknown;
}

const NOTHING_READ = null;

async function readDeezer(url: string, options: DeezerOptions): Promise<DeezerRead> {
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(url, { headers: DEEZER_HEADERS });
  if (!response.ok) return { refusedWithStatus: response.status, body: NOTHING_READ };
  const body: unknown = await response.json();
  const errorCode = readDeezerErrorCode(body);
  if (errorCode === DEEZER_QUOTA_ERROR_CODE) {
    return { refusedWithStatus: DEEZER_QUOTA_STATUS, body };
  }
  return { refusedWithStatus: null, body };
}

/**
 * @Blueprint adapter-failure-inside-a-200
 * @BlueprintName Adapter Over A Service That Refuses Inside A 200
 * @BlueprintUsage Use for a third-party HTTP service that answers 200 to a request it refused and states the refusal only in the body.
 * @BlueprintDescription Reads the status and the body's own error code through one private helper both calls share, so no route can be written that checks the transport and forgets the payload. A quota refusal is mapped onto the `unavailable` arm carrying a status this application chose, because a caller deciding whether to show "try again" must not have to know which of the two layers refused. It takes the fetcher as an option so a test drives it without a network, and returns the domain's own type by handing the payload to the sibling `.core.ts`. It holds no clock and no self-throttle, unlike `adapter-rate-limited-fetch`: this service publishes no per-second limit small enough for one instance to police, and the shared cache table in front of it is what absorbs a burst.
 * @DependsOnExternal deezer
 */
export async function searchDeezerTracks(
  query: string,
  options: DeezerOptions = {},
): Promise<DeezerSearchOutcome> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return { kind: 'ok', hits: [] };
  const url = `${DEEZER_SEARCH_URL}?q=${encodeURIComponent(trimmed)}&limit=${DEEZER_SEARCH_LIMIT}`;
  const read = await readDeezer(url, options);
  if (read.refusedWithStatus !== null) {
    return { kind: 'unavailable', status: read.refusedWithStatus };
  }
  return { kind: 'ok', hits: collapseTracksSharingAnIsrc(mapDeezerTracks(read.body)) };
}

// @FollowsBlueprint adapter-failure-inside-a-200
export async function readDeezerTrack(
  trackId: string,
  options: DeezerOptions = {},
): Promise<DeezerTrackOutcome> {
  const read = await readDeezer(`${DEEZER_TRACK_URL}${encodeURIComponent(trackId)}`, options);
  if (read.refusedWithStatus !== null) {
    return { kind: 'unavailable', status: read.refusedWithStatus };
  }
  const track = mapDeezerTrack(read.body);
  if (track === null) return { kind: 'unknown' };
  return { kind: 'ok', track };
}
