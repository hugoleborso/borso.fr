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
    await expect(fetchDecksDocument('/decks.json')).resolves.toEqual({
      status: 'arrived',
      body: { version: 1, decks: [] },
    });
    expect(fetcher).toHaveBeenCalledWith('/decks.json', { cache: 'no-cache' });
  });

  it('answers unreachable on a refusal', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json({ version: 1 }, { status: 503 }))),
    );
    await expect(fetchDecksDocument('/decks.json')).resolves.toEqual({ status: 'unreachable' });
  });

  it('answers unreachable on a network failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('offline'))),
    );
    await expect(fetchDecksDocument('/decks.json')).resolves.toEqual({ status: 'unreachable' });
  });

  it('answers unreachable when the connection drops while the body streams', async () => {
    const response = new Response('{}');
    vi.spyOn(response, 'json').mockRejectedValue(new TypeError('network error'));
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(response)),
    );
    await expect(fetchDecksDocument('/decks.json')).resolves.toEqual({ status: 'unreachable' });
  });

  it('hands over an empty body when the answer arrived and is no JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('<html>'))),
    );
    await expect(fetchDecksDocument('/decks.json')).resolves.toEqual({
      status: 'arrived',
      body: null,
    });
  });
});
