/**
 * @DependsOnExternal calendar-providers
 */

import type { FeedFailure } from './calendar-feeds.types';
import { judgeFeedAddress } from './feed-address.core';
import { classifyFeedStatus, isOverSizeLimit } from './feed-response.core';

export const FEED_TIMEOUT_MS = 4_000;
const FEED_MAX_MEGABYTES = 5;
const BYTES_PER_MEGABYTE = 1_048_576;
export const FEED_MAX_BYTES = FEED_MAX_MEGABYTES * BYTES_PER_MEGABYTE;
export const MAX_REDIRECTS = 3;

const LOCATION_HEADER = 'location';

export type FeedFetcher = (address: string, init: RequestInit) => Promise<Response>;

export type FeedReadOutcome =
  { readonly kind: 'ok'; readonly body: string } | { readonly kind: FeedFailure };

export interface ReadFeedOptions {
  readonly fetcher?: FeedFetcher;
  readonly timeoutMs?: number;
  readonly maxBytes?: number;
}

const UNAVAILABLE: FeedReadOutcome = { kind: 'unavailable' };
const NEEDS_RECONNECTING: FeedReadOutcome = { kind: 'needs-reconnecting' };

async function abandon(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<null> {
  await reader.cancel();
  return null;
}

async function readBodyWithin(response: Response, maxBytes: number): Promise<string | null> {
  if (response.body === null) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  let receivedBytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return text + decoder.decode();
    receivedBytes += value.byteLength;
    if (isOverSizeLimit(receivedBytes, maxBytes)) return await abandon(reader);
    text += decoder.decode(value, { stream: true });
  }
}

interface FeedRequest {
  readonly fetcher: FeedFetcher;
  readonly signal: AbortSignal;
  readonly maxBytes: number;
}

function nextHop(response: Response, currentAddress: string, hopsLeft: number): string | null {
  if (hopsLeft === 0) return null;
  const location = response.headers.get(LOCATION_HEADER);
  if (location === null) return null;
  const verdict = judgeFeedAddress(new URL(location, currentAddress).toString());
  return verdict.kind === 'accepted' ? verdict.address : null;
}

async function readFeedBody(response: Response, maxBytes: number): Promise<FeedReadOutcome> {
  const body = await readBodyWithin(response, maxBytes);
  return body === null ? UNAVAILABLE : { kind: 'ok', body };
}

async function followRedirect(
  response: Response,
  currentAddress: string,
  request: FeedRequest,
  hopsLeft: number,
): Promise<FeedReadOutcome> {
  const next = nextHop(response, currentAddress, hopsLeft);
  if (next === null) return UNAVAILABLE;
  return await followToTheFeed(next, request, hopsLeft - 1);
}

async function followToTheFeed(
  address: string,
  request: FeedRequest,
  hopsLeft: number,
): Promise<FeedReadOutcome> {
  const response = await request.fetcher(address, { redirect: 'manual', signal: request.signal });
  const statusClass = classifyFeedStatus(response.status);
  if (statusClass === 'gone') return NEEDS_RECONNECTING;
  if (statusClass === 'failed') return UNAVAILABLE;
  if (statusClass === 'redirect') return await followRedirect(response, address, request, hopsLeft);
  return await readFeedBody(response, request.maxBytes);
}

// @FollowsBlueprint adapter-external-service
export async function readCalendarFeed(
  storedAddress: string,
  options: ReadFeedOptions = {},
): Promise<FeedReadOutcome> {
  const verdict = judgeFeedAddress(storedAddress);
  if (verdict.kind === 'rejected') return NEEDS_RECONNECTING;
  const fetcher = options.fetcher ?? fetch;
  const signal = AbortSignal.timeout(options.timeoutMs ?? FEED_TIMEOUT_MS);
  try {
    return await followToTheFeed(
      verdict.address,
      { fetcher, signal, maxBytes: options.maxBytes ?? FEED_MAX_BYTES },
      MAX_REDIRECTS,
    );
  } catch {
    return UNAVAILABLE;
  }
}
