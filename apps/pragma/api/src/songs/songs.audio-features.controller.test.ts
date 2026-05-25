/**
 * Back-e2e gate for the GetSongBPM secondary lookup on the song
 * `/search` endpoint. Mocks both upstreams (MusicBrainz + GetSongBPM)
 * via `globalThis.fetch` and asserts:
 *   - tonality + bpm are merged onto the first MB hit when
 *     `GETSONGBPM_API_KEY` is set;
 *   - the search still returns clean MB hits (with `tonality: null`
 *     and `bpm: null`) when the API key is empty.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import MUSICBRAINZ_FIXTURE from './__fixtures__/musicbrainz-sample.json';
import GETSONGBPM_FIXTURE from './__fixtures__/getsongbpm-sample.json';
import { buildAuthenticatedApp, jsonRequest, readJson } from '../../../test/auth-utils';
import { truncateAllTables, testDatabase } from '../../../test/database-utils';

const hitsEnvelope = z.object({
  hits: z.array(
    z.object({
      mbid: z.string(),
      title: z.string(),
      artist: z.string(),
      tonality: z.string().nullable(),
      bpm: z.number().nullable(),
      durationSeconds: z.number().nullable(),
    }).passthrough(),
  ),
});

function jsonResponse(payload: unknown, init: ResponseInit = { status: 200 }): Response {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
}

describe('songs controller — GetSongBPM enrichment (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GETSONGBPM_API_KEY;
  });

  it('merges tonality + bpm onto the top MusicBrainz hit when the key is set', async () => {
    process.env.GETSONGBPM_API_KEY = 'fake-key-for-test';
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input) => {
        const url = String(input);
        if (url.includes('musicbrainz.org')) {
          return jsonResponse(MUSICBRAINZ_FIXTURE);
        }
        if (url.includes('api.getsongbpm.com')) {
          return jsonResponse(GETSONGBPM_FIXTURE);
        }
        throw new Error(`unexpected fetch: ${url}`);
      });
    const response = await jsonRequest(app, `/api/songs/search?q=audio-${Date.now()}`, {
      cookieHeader,
    });
    expect(response.status).toBe(200);
    const body = await readJson(response, hitsEnvelope);
    expect(body.hits.length).toBeGreaterThan(0);
    const topHit = body.hits[0];
    expect(topHit?.tonality).toBe('F#m');
    expect(topHit?.bpm).toBe(116);
    expect(topHit?.durationSeconds).toBe(369);
    const calledUrls = fetchSpy.mock.calls.map((call) => String(call[0]));
    expect(calledUrls.some((url) => url.includes('musicbrainz.org'))).toBe(true);
    expect(calledUrls.some((url) => url.includes('api.getsongbpm.com'))).toBe(true);
    const enrichmentCalls = calledUrls.filter((url) => url.includes('api.getsongbpm.com'));
    expect(enrichmentCalls).toHaveLength(1);
    const enrichmentUrl = enrichmentCalls[0] ?? '';
    expect(enrichmentUrl).toContain('api_key=fake-key-for-test');
    expect(enrichmentUrl).toContain('type=both');
  });

  it('gracefully no-ops the secondary lookup when GETSONGBPM_API_KEY is empty', async () => {
    delete process.env.GETSONGBPM_API_KEY;
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input) => {
        const url = String(input);
        if (url.includes('musicbrainz.org')) {
          return jsonResponse(MUSICBRAINZ_FIXTURE);
        }
        throw new Error(`unexpected fetch: ${url}`);
      });
    const response = await jsonRequest(app, `/api/songs/search?q=noop-${Date.now()}`, {
      cookieHeader,
    });
    expect(response.status).toBe(200);
    const body = await readJson(response, hitsEnvelope);
    expect(body.hits.length).toBeGreaterThan(0);
    const topHit = body.hits[0];
    expect(topHit?.tonality).toBe(null);
    expect(topHit?.bpm).toBe(null);
    // MusicBrainz still supplies its own duration on the fixture.
    expect(topHit?.durationSeconds).toBe(369);
    const calledUrls = fetchSpy.mock.calls.map((call) => String(call[0]));
    expect(calledUrls.some((url) => url.includes('api.getsongbpm.com'))).toBe(false);
  });
});
