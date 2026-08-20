/**
 * @vitest-environment node
 */

// @FollowsBlueprint test-node-adapter

import { describe, expect, it, vi } from 'vitest';
import FIXTURE from './__fixtures__/musicbrainz-sample.json';
import {
  type ExternalFetcher,
  type ExternalSearchState,
  searchExternal,
} from './musicbrainz.adapter';
import type { ExternalSearchCacheEntry } from './musicbrainz.core';

const CACHE_TTL_MS = 60_000;
const RATE_FLOOR_MS = 1_000;

function freshState(lastCallAt = 0): ExternalSearchState {
  return { cache: new Map<string, ExternalSearchCacheEntry>(), lastCallAt };
}

function respondWith(body: unknown, status = 200): ExternalFetcher {
  return () => Promise.resolve(new Response(JSON.stringify(body), { status }));
}

describe('searchExternal', () => {
  it('asks nothing of the service when the query is blank', async () => {
    const fetcher = vi.fn(respondWith(FIXTURE));
    const hits = await searchExternal('   ', { fetcher, now: () => 0, state: freshState() });
    expect(hits).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('carries the query, the widened limit and the forgiving parser in the URL', async () => {
    const fetcher = vi.fn(respondWith(FIXTURE));
    await searchExternal('Get Lucky', { fetcher, now: () => 0, state: freshState() });
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toContain('query=Get%20Lucky');
    expect(url).toContain('limit=25');
    expect(url).toContain('dismax=true');
    expect(init?.headers).toMatchObject({ Accept: 'application/json' });
  });

  it('returns the ranked hits the payload maps to', async () => {
    const hits = await searchExternal('Get Lucky', {
      fetcher: respondWith(FIXTURE),
      now: () => 0,
      state: freshState(),
    });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.title).toBe('Get Lucky');
  });

  it('answers a repeated query from the cache rather than the service', async () => {
    const fetcher = vi.fn(respondWith(FIXTURE));
    const state = freshState();
    const first = await searchExternal('Get Lucky', { fetcher, now: () => 0, state });
    const second = await searchExternal('GET LUCKY', { fetcher, now: () => 0, state });
    expect(second).toEqual(first);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('keys the cache by the lowercased query, so any casing finds the same entry', async () => {
    const state = freshState();
    await searchExternal('Get Lucky', { fetcher: respondWith(FIXTURE), now: () => 0, state });
    expect([...state.cache.keys()]).toEqual(['get lucky']);
  });

  it('asks again once the cached answer has aged past its lifetime', async () => {
    const fetcher = vi.fn(respondWith(FIXTURE));
    const state = freshState();
    let clock = 0;
    const now = (): number => clock;
    await searchExternal('Get Lucky', { fetcher, now, state });
    clock = CACHE_TTL_MS + 1;
    await searchExternal('Get Lucky', { fetcher, now, state });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('holds the call back for exactly the rest of the floor', async () => {
    vi.useFakeTimers();
    try {
      const fetcher = vi.fn(respondWith(FIXTURE));
      const state = freshState(RATE_FLOOR_MS - 1);
      const pending = searchExternal('Get Lucky', { fetcher, now: () => RATE_FLOOR_MS, state });
      await vi.advanceTimersByTimeAsync(0);
      expect(fetcher).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(RATE_FLOOR_MS - 2);
      expect(fetcher).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      await pending;
      expect(fetcher).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('schedules no wait at all once the floor has elapsed', async () => {
    vi.useFakeTimers();
    const scheduleWait = vi.spyOn(globalThis, 'setTimeout');
    try {
      const fetcher = vi.fn(respondWith(FIXTURE));
      const state = freshState(0);
      const pending = searchExternal('Get Lucky', { fetcher, now: () => RATE_FLOOR_MS, state });
      await vi.advanceTimersByTimeAsync(0);
      expect(scheduleWait).not.toHaveBeenCalled();
      expect(fetcher).toHaveBeenCalledTimes(1);
      await pending;
    } finally {
      scheduleWait.mockRestore();
      vi.useRealTimers();
    }
  });

  it('treats a refusal as no results rather than an error the caller must handle', async () => {
    const hits = await searchExternal('Get Lucky', {
      fetcher: respondWith(FIXTURE, 503),
      now: () => 0,
      state: freshState(),
    });
    expect(hits).toEqual([]);
  });

  it('falls back to its own cache and clock when the caller names neither', async () => {
    const fetcher = vi.fn(respondWith(FIXTURE));
    const hits = await searchExternal('Get Lucky', { fetcher });
    expect(hits.length).toBeGreaterThan(0);
  });

  it('falls back to the platform fetch when the caller names no fetcher', async () => {
    const platformFetch = vi.fn(respondWith(FIXTURE));
    vi.stubGlobal('fetch', platformFetch);
    try {
      const hits = await searchExternal('Around The World', { now: () => 0, state: freshState() });
      expect(platformFetch).toHaveBeenCalledTimes(1);
      expect(hits.length).toBeGreaterThan(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
