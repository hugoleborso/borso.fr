import { describe, expect, it, vi } from 'vitest';
import { type BarSearchState, type PlacesFetcher, searchPlacesForBars } from './bar-search.adapter';

const BODY = [{ place_id: 1, name: 'Le Zinc', display_name: 'Le Zinc, Paris' }];

function respondWith(body: unknown, isOk = true): Response {
  return new Response(JSON.stringify(body), { status: isOk ? 200 : 500 });
}

function freshState(): BarSearchState {
  return { cache: new Map(), lastCallAt: 0 };
}

describe('searchPlacesForBars', () => {
  it('asks the service for the query and maps what comes back', async () => {
    const fetcher = vi.fn<PlacesFetcher>(async () => respondWith(BODY));
    const hits = await searchPlacesForBars('  zinc paris ', {
      fetcher,
      state: freshState(),
      now: () => 10_000,
    });

    expect(hits).toEqual([expect.objectContaining({ name: 'Le Zinc' })]);
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toContain('https://nominatim.openstreetmap.org/search?');
    expect(url).toContain('q=zinc+paris');
    expect(url).toContain('extratags=1');
    expect(url).toContain('addressdetails=1');
    expect(init?.headers).toMatchObject({ 'User-Agent': 'Pragma/1.0 (https://pragma.borso.fr)' });
  });

  it('answers an empty list for a blank query without calling out', async () => {
    const fetcher = vi.fn<PlacesFetcher>();
    expect(await searchPlacesForBars('   ', { fetcher, state: freshState() })).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('ignores the body of a call the service refused', async () => {
    const fetcher = vi.fn<PlacesFetcher>(async () => respondWith(BODY, false));
    expect(
      await searchPlacesForBars('zinc', { fetcher, state: freshState(), now: () => 10_000 }),
    ).toEqual([]);
  });

  it('serves a repeated query from the cache, which the usage policy requires', async () => {
    const fetcher = vi.fn<PlacesFetcher>(async () => respondWith(BODY));
    const state = freshState();
    await searchPlacesForBars('Zinc', { fetcher, state, now: () => 10_000 });
    const second = await searchPlacesForBars('  zinc  ', { fetcher, state, now: () => 20_000 });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(second).toEqual([expect.objectContaining({ name: 'Le Zinc' })]);
  });

  it('asks again once the cached answer has expired', async () => {
    const fetcher = vi.fn<PlacesFetcher>(async () => respondWith(BODY));
    const state = freshState();
    await searchPlacesForBars('zinc', { fetcher, state, now: () => 0 });
    await searchPlacesForBars('zinc', { fetcher, state, now: () => 3_600_001 });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(state.cache.size).toBe(1);
  });

  it('spaces two different queries by the second the usage policy asks for', async () => {
    vi.useFakeTimers();
    try {
      const fetcher = vi.fn<PlacesFetcher>(async () => respondWith(BODY));
      const state = freshState();
      state.lastCallAt = 10_000;
      const pending = searchPlacesForBars('zinc', { fetcher, state, now: () => 10_400 });

      await vi.advanceTimersByTimeAsync(599);
      expect(fetcher).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      await pending;
      expect(fetcher).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('reaches the network through the global fetch when the caller passes none', async () => {
    const globalFetch = vi.fn<typeof fetch>(async () => respondWith(BODY));
    vi.stubGlobal('fetch', globalFetch);

    const hits = await searchPlacesForBars('zinc', { state: freshState(), now: () => 10_000 });

    expect(globalFetch).toHaveBeenCalledTimes(1);
    expect(hits).toEqual([expect.objectContaining({ name: 'Le Zinc' })]);
    vi.unstubAllGlobals();
  });

  it('keeps one shared state across calls that pass none', async () => {
    const globalFetch = vi.fn<typeof fetch>(async () => respondWith(BODY));
    vi.stubGlobal('fetch', globalFetch);

    await searchPlacesForBars('shared-state-query');
    await searchPlacesForBars('shared-state-query');

    expect(globalFetch).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
