/**
 * @vitest-environment node
 *
 * The adapter is impure and still fully covered, because its three impure
 * edges — the fetcher, the clock and the cache — all arrive as options. The
 * rate-limit case uses fake timers rather than a synchronous assertion: the
 * fetch is awaited whether or not a wait happened, so a synchronous
 * expectation cannot tell the two apart.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildLookupState,
  listOpenLibraryMatches,
  type LookupFetcher,
  type LookupState,
} from './openlibrary.adapter';

const RATE_LIMIT_FLOOR_MS = 1000;
const CACHE_TTL_MS = 60_000;

const SEARCH_PAYLOAD = {
  docs: [
    {
      key: '/works/OL893415W',
      title: 'Dune',
      author_name: ['Frank Herbert'],
      first_publish_year: 1965,
      isbn: ['0441013597'],
      cover_i: 8100910,
      edition_count: 210,
    },
  ],
};

const respondWithMatches: LookupFetcher = () =>
  Promise.resolve(
    new Response(JSON.stringify(SEARCH_PAYLOAD), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );

const respondWithFailure: LookupFetcher = () =>
  Promise.resolve(new Response('upstream is down', { status: 503 }));

describe('listOpenLibraryMatches', () => {
  let state: LookupState;
  let clockMillis: number;

  const readClock = () => clockMillis;

  beforeEach(() => {
    state = buildLookupState();
    clockMillis = 5_000_000;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('answers with no matches for a blank query without calling the service', async () => {
    const fetcher = vi.fn(respondWithMatches);
    expect(await listOpenLibraryMatches('   ', { state, readClock, fetcher })).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('returns the domain hits rather than the payload the service sent', async () => {
    const matches = await listOpenLibraryMatches('dune', {
      state,
      readClock,
      fetcher: respondWithMatches,
    });
    expect(matches).toEqual([
      {
        key: '/works/OL893415W',
        title: 'Dune',
        author: 'Frank Herbert',
        firstPublishedYear: 1965,
        isbn: '0441013597',
        coverUrl: 'https://covers.openlibrary.org/b/id/8100910-M.jpg',
        editionCount: 210,
      },
    ]);
  });

  it('asks for the query, the row limit and the named fields, and identifies itself', async () => {
    const fetcher = vi.fn(respondWithMatches);
    await listOpenLibraryMatches('dune messiah', { state, readClock, fetcher });
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toContain('https://openlibrary.org/search.json?');
    expect(url).toContain('q=dune+messiah');
    expect(url).toContain('limit=20');
    expect(url).toContain('fields=key%2Ctitle%2Cauthor_name');
    expect(init?.headers).toMatchObject({ Accept: 'application/json' });
  });

  it('answers a second identical query from the cache without a second call', async () => {
    const fetcher = vi.fn(respondWithMatches);
    await listOpenLibraryMatches('dune', { state, readClock, fetcher });
    clockMillis += RATE_LIMIT_FLOOR_MS;
    const cached = await listOpenLibraryMatches('  DUNE  ', { state, readClock, fetcher });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(cached).toHaveLength(1);
  });

  it('calls the service again once the cached answer has expired', async () => {
    const fetcher = vi.fn(respondWithMatches);
    await listOpenLibraryMatches('dune', { state, readClock, fetcher });
    clockMillis += CACHE_TTL_MS;
    await listOpenLibraryMatches('dune', { state, readClock, fetcher });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('keeps a live entry while evicting an expired one', async () => {
    const fetcher = vi.fn(respondWithMatches);
    await listOpenLibraryMatches('dune', { state, readClock, fetcher });
    clockMillis += RATE_LIMIT_FLOOR_MS;
    await listOpenLibraryMatches('solaris', { state, readClock, fetcher });
    expect(state.cache.size).toBe(2);
    clockMillis += CACHE_TTL_MS - RATE_LIMIT_FLOOR_MS;
    await listOpenLibraryMatches('solaris', { state, readClock, fetcher });
    expect([...state.cache.keys()]).toEqual(['solaris']);
  });

  it('answers with no matches when the service refuses, and caches nothing', async () => {
    const matches = await listOpenLibraryMatches('dune', {
      state,
      readClock,
      fetcher: respondWithFailure,
    });
    expect(matches).toEqual([]);
    expect(state.cache.size).toBe(0);
  });

  it('holds a second call back until the one-second floor has passed', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(respondWithMatches);
    await listOpenLibraryMatches('dune', { state, readClock, fetcher });
    expect(fetcher).toHaveBeenCalledTimes(1);

    const pending = listOpenLibraryMatches('solaris', { state, readClock, fetcher });
    await vi.advanceTimersByTimeAsync(RATE_LIMIT_FLOOR_MS - 1);
    expect(fetcher).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('falls back on the process fetch, the wall clock and the module cache', async () => {
    const fetcher = vi.fn(respondWithMatches);
    vi.stubGlobal('fetch', fetcher);
    const matches = await listOpenLibraryMatches('a query no other case uses');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(matches).toHaveLength(1);
  });
});
