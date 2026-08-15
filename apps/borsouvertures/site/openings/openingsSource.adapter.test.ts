/**
 * The three ways the network fails to produce a document all collapse into one
 * absent value, so each test names the failure it stands for rather than the
 * shape it returns.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchOpeningsDocument } from './openingsSource.adapter';

type PlatformFetch = (url: string, init: RequestInit) => Promise<Response>;

const URL_UNDER_TEST = '/openings.json';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('fetchOpeningsDocument', () => {
  it('asks for a fresh copy rather than whatever the cache holds', async () => {
    const fetcher = vi.fn<PlatformFetch>(() => Promise.resolve(Response.json({ openings: [] })));
    vi.stubGlobal('fetch', fetcher);
    await fetchOpeningsDocument(URL_UNDER_TEST);
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe(URL_UNDER_TEST);
    expect(init).toMatchObject({ cache: 'no-cache' });
  });

  it('hands back the document the network answered with', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(Response.json({ openings: ['ruy-lopez'] })));
    expect(await fetchOpeningsDocument(URL_UNDER_TEST)).toEqual({ openings: ['ruy-lopez'] });
  });

  it('answers with nothing when the origin refuses', async () => {
    // A readable body on purpose: with an unreadable one the status guard could
    // be deleted and the parse failure would produce the same absent value.
    vi.stubGlobal('fetch', () =>
      Promise.resolve(Response.json({ openings: ['ruy-lopez'] }, { status: 404 })),
    );
    expect(await fetchOpeningsDocument(URL_UNDER_TEST)).toBeNull();
  });

  it('answers with nothing when the request never completes, and says so once', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', () => Promise.reject(new Error('offline')));
    expect(await fetchOpeningsDocument(URL_UNDER_TEST)).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('bundled fallback');
  });

  it('answers with nothing when the body is not a document', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('not json', { status: 200 })));
    expect(await fetchOpeningsDocument(URL_UNDER_TEST)).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
