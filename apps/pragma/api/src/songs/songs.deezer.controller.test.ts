import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { buildAuthenticatedApp, jsonRequest, readJson } from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';

const songSchema = z.object({
  id: z.guid(),
  title: z.string(),
  artist: z.string(),
  status: z.string(),
  deezerTrackId: z.string().nullable(),
  album: z.string().nullable(),
  durationSeconds: z.number().nullable(),
  tags: z.array(z.string()),
  isrcs: z.array(z.string()),
});

const singleEnvelope = z.object({ song: songSchema.loose() });

async function createSong(
  app: Awaited<ReturnType<typeof buildAuthenticatedApp>>['app'],
  cookieHeader: string,
  deezerTrackId: string | null,
): Promise<string> {
  const create = await jsonRequest(app, '/api/songs', {
    method: 'POST',
    body: { title: 'Get Lucky', status: 'wip', deezerTrackId },
    cookieHeader,
  });
  return (await readJson(create, singleEnvelope)).song.id;
}

function answerDeezer(body: unknown, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

// @FollowsBlueprint test-back-e2e
describe('songs controller — Deezer enrichment columns (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  it('round-trips deezerTrackId, album, duration, tags, isrcs through create / read / update', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const create = await jsonRequest(app, '/api/songs', {
      method: 'POST',
      body: {
        title: 'Get Lucky',
        artist: 'Daft Punk',
        status: 'wip',
        deezerTrackId: 'fa28c7e7-a3ea-4f5f-9f5d-3a3f2c2b1a01',
        album: 'Random Access Memories',
        durationSeconds: 369,
        tags: ['electronic', 'disco', 'funk'],
        isrcs: ['USQX91300108', 'GBUM71302999'],
      },
      cookieHeader,
    });
    expect(create.status).toBe(201);
    const created = await readJson(create, singleEnvelope);
    expect(created.song.deezerTrackId).toBe('fa28c7e7-a3ea-4f5f-9f5d-3a3f2c2b1a01');
    expect(created.song.album).toBe('Random Access Memories');
    expect(created.song.durationSeconds).toBe(369);
    expect(created.song.tags).toEqual(['electronic', 'disco', 'funk']);
    expect(created.song.isrcs).toEqual(['USQX91300108', 'GBUM71302999']);

    const refetched = await readJson(
      await jsonRequest(app, `/api/songs/${created.song.id}`, { cookieHeader }),
      singleEnvelope,
    );
    expect(refetched.song.deezerTrackId).toBe('fa28c7e7-a3ea-4f5f-9f5d-3a3f2c2b1a01');
    expect(refetched.song.tags).toEqual(['electronic', 'disco', 'funk']);

    const update = await jsonRequest(app, `/api/songs/${created.song.id}`, {
      method: 'PUT',
      body: { tags: ['indie', 'pop'], album: null },
      cookieHeader,
    });
    expect(update.status).toBe(200);
    const updated = await readJson(update, singleEnvelope);
    expect(updated.song.tags).toEqual(['indie', 'pop']);
    expect(updated.song.album).toBe(null);
    expect(updated.song.deezerTrackId).toBe('fa28c7e7-a3ea-4f5f-9f5d-3a3f2c2b1a01');
  });

  it('lands Deezer-free songs with empty arrays + null metadata defaults', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const create = await jsonRequest(app, '/api/songs', {
      method: 'POST',
      body: { title: 'Manual entry', status: 'idea' },
      cookieHeader,
    });
    const created = await readJson(create, singleEnvelope);
    expect(created.song.deezerTrackId).toBe(null);
    expect(created.song.album).toBe(null);
    expect(created.song.durationSeconds).toBe(null);
    expect(created.song.tags).toEqual([]);
    expect(created.song.isrcs).toEqual([]);
  });

  describe('the preview a song plays in its page', () => {
    const PREVIEW_URL = 'https://cdnt-preview.dzcdn.net/api/1/1/c/8/a/0/c8a6.mp3?hdnea=exp=1';
    const previewEnvelope = z.object({ previewUrl: z.string().nullable() });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('requires a session', async () => {
      const { app } = await buildAuthenticatedApp();
      const response = await jsonRequest(app, `/api/songs/${crypto.randomUUID()}/preview`);
      expect(response.status).toBe(401);
    });

    it('resolves a fresh preview of the song track from Deezer at every read', async () => {
      const { app, cookieHeader } = await buildAuthenticatedApp();
      const songId = await createSong(app, cookieHeader, '67238735');
      const fetchSpy = answerDeezer({ id: 67238735, preview: PREVIEW_URL });
      const response = await jsonRequest(app, `/api/songs/${songId}/preview`, { cookieHeader });
      expect(response.status).toBe(200);
      expect(await readJson(response, previewEnvelope)).toEqual({ previewUrl: PREVIEW_URL });
      const calledInput = fetchSpy.mock.calls[0]?.[0];
      const calledUrl = calledInput instanceof Request ? calledInput.url : String(calledInput);
      expect(calledUrl).toBe('https://api.deezer.com/track/67238735');
    });

    it('answers no preview without asking Deezer for a song that names no track', async () => {
      const { app, cookieHeader } = await buildAuthenticatedApp();
      const songId = await createSong(app, cookieHeader, null);
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const response = await jsonRequest(app, `/api/songs/${songId}/preview`, { cookieHeader });
      expect(await readJson(response, previewEnvelope)).toEqual({ previewUrl: null });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('answers no preview for a track Deezer holds no excerpt of', async () => {
      const { app, cookieHeader } = await buildAuthenticatedApp();
      const songId = await createSong(app, cookieHeader, '67238735');
      answerDeezer({ id: 67238735, preview: '' });
      const response = await jsonRequest(app, `/api/songs/${songId}/preview`, { cookieHeader });
      expect(await readJson(response, previewEnvelope)).toEqual({ previewUrl: null });
    });

    it('answers 503 when Deezer refuses, so the page can tell it from a track with no excerpt', async () => {
      const { app, cookieHeader } = await buildAuthenticatedApp();
      const songId = await createSong(app, cookieHeader, '67238735');
      answerDeezer({ error: { type: 'Exception', code: 4 } });
      const response = await jsonRequest(app, `/api/songs/${songId}/preview`, { cookieHeader });
      expect(response.status).toBe(503);
    });

    it('answers 404 for a song that does not exist', async () => {
      const { app, cookieHeader } = await buildAuthenticatedApp();
      const response = await jsonRequest(app, `/api/songs/${crypto.randomUUID()}/preview`, {
        cookieHeader,
      });
      expect(response.status).toBe(404);
    });
  });
});
