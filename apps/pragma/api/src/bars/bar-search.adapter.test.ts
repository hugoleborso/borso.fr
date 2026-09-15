import { describe, expect, it, vi } from 'vitest';
import { type PlacesFetcher, searchPlacesForBars } from './bar-search.adapter';

const BODY = {
  places: [{ id: 'places/1', displayName: { text: 'Le Zinc' } }],
};

function respondWith(body: unknown, isOk = true): Response {
  return new Response(JSON.stringify(body), { status: isOk ? 200 : 500 });
}

describe('searchPlacesForBars', () => {
  it('says so when the deployment carries no key, without calling out', async () => {
    const fetcher = vi.fn<PlacesFetcher>();
    const outcome = await searchPlacesForBars('zinc', { fetcher, apiKey: undefined });
    expect(outcome).toEqual({ kind: 'not-configured' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('treats an empty key as no key', async () => {
    expect(await searchPlacesForBars('zinc', { apiKey: '' })).toEqual({ kind: 'not-configured' });
  });

  it('asks the vendor for the query and maps what comes back', async () => {
    const fetcher = vi.fn<PlacesFetcher>(async () => respondWith(BODY));
    const outcome = await searchPlacesForBars('  zinc paris ', { fetcher, apiKey: 'key-1' });

    expect(outcome).toEqual({ kind: 'ok', hits: [expect.objectContaining({ name: 'Le Zinc' })] });
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe('https://places.googleapis.com/v1/places:searchText');
    expect(init?.headers).toMatchObject({ 'X-Goog-Api-Key': 'key-1' });
    expect(init?.body).toContain('zinc paris');
  });

  it('answers an empty list for a blank query without calling out', async () => {
    const fetcher = vi.fn<PlacesFetcher>();
    expect(await searchPlacesForBars('   ', { fetcher, apiKey: 'key-1' })).toEqual({
      kind: 'ok',
      hits: [],
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('answers an empty list when the vendor refuses the call', async () => {
    const fetcher = vi.fn<PlacesFetcher>(async () => respondWith({}, false));
    expect(await searchPlacesForBars('zinc', { fetcher, apiKey: 'key-1' })).toEqual({
      kind: 'ok',
      hits: [],
    });
  });

  it('reaches the network through the global fetch when the caller passes none', async () => {
    const globalFetch = vi.fn<typeof fetch>(async () => respondWith(BODY));
    vi.stubGlobal('fetch', globalFetch);

    const outcome = await searchPlacesForBars('zinc', { apiKey: 'key-1' });

    expect(globalFetch).toHaveBeenCalledTimes(1);
    expect(outcome).toEqual({ kind: 'ok', hits: [expect.objectContaining({ name: 'Le Zinc' })] });
    vi.unstubAllGlobals();
  });

  it('reads the key from the environment when the caller passes none', async () => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', 'env-key');
    const fetcher = vi.fn<PlacesFetcher>(async () => respondWith(BODY));
    await searchPlacesForBars('zinc', { fetcher });
    expect(fetcher.mock.calls[0]?.[1]?.headers).toMatchObject({ 'X-Goog-Api-Key': 'env-key' });
    vi.unstubAllEnvs();
  });
});
