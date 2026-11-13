import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchDecksDocument } from './decks-source.adapter';

// @FollowsBlueprint test-pure-unit
describe('fetchDecksDocument', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the body of a successful answer, bypassing the HTTP cache', async () => {
    const fetcher = vi.fn(() => Promise.resolve(Response.json({ version: 1, decks: [] })));
    vi.stubGlobal('fetch', fetcher);
    await expect(fetchDecksDocument('/decks.json')).resolves.toEqual({ version: 1, decks: [] });
    expect(fetcher).toHaveBeenCalledWith('/decks.json', { cache: 'no-cache' });
  });

  it('returns null on a refusal', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json({ version: 1 }, { status: 404 }))),
    );
    await expect(fetchDecksDocument('/decks.json')).resolves.toBeNull();
  });

  it('returns null on a network failure and on a body that is no JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('offline'))),
    );
    await expect(fetchDecksDocument('/decks.json')).resolves.toBeNull();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('<html>'))),
    );
    await expect(fetchDecksDocument('/decks.json')).resolves.toBeNull();
  });
});
