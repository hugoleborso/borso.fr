/**
 * Back-e2e gate for the MusicBrainz enrichment columns on the song
 * table — round-trips `mbid`, `album`, `durationSeconds`, `tags`,
 * `isrcs` through create / read / update. Split out of
 * `songs.controller.test.ts` so each file stays under the per-file
 * line cap; the auth/CRUD smoke covers the same controller surface.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildAuthenticatedApp, jsonRequest, readJson } from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';

const songSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  artist: z.string(),
  status: z.string(),
  mbid: z.string().nullable(),
  album: z.string().nullable(),
  durationSeconds: z.number().nullable(),
  tags: z.array(z.string()),
  isrcs: z.array(z.string()),
});

const singleEnvelope = z.object({ song: songSchema.passthrough() });

describe('songs controller — MusicBrainz enrichment columns (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  it('round-trips mbid, album, duration, tags, isrcs through create / read / update', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const create = await jsonRequest(app, '/api/songs', {
      method: 'POST',
      body: {
        title: 'Get Lucky',
        artist: 'Daft Punk',
        status: 'wip',
        mbid: 'fa28c7e7-a3ea-4f5f-9f5d-3a3f2c2b1a01',
        album: 'Random Access Memories',
        durationSeconds: 369,
        tags: ['electronic', 'disco', 'funk'],
        isrcs: ['USQX91300108', 'GBUM71302999'],
      },
      cookieHeader,
    });
    expect(create.status).toBe(201);
    const created = await readJson(create, singleEnvelope);
    expect(created.song.mbid).toBe('fa28c7e7-a3ea-4f5f-9f5d-3a3f2c2b1a01');
    expect(created.song.album).toBe('Random Access Memories');
    expect(created.song.durationSeconds).toBe(369);
    expect(created.song.tags).toEqual(['electronic', 'disco', 'funk']);
    expect(created.song.isrcs).toEqual(['USQX91300108', 'GBUM71302999']);

    const refetched = await readJson(
      await jsonRequest(app, `/api/songs/${created.song.id}`, { cookieHeader }),
      singleEnvelope,
    );
    expect(refetched.song.mbid).toBe('fa28c7e7-a3ea-4f5f-9f5d-3a3f2c2b1a01');
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
    expect(updated.song.mbid).toBe('fa28c7e7-a3ea-4f5f-9f5d-3a3f2c2b1a01');
  });

  it('lands MusicBrainz-free songs with empty arrays + null metadata defaults', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const create = await jsonRequest(app, '/api/songs', {
      method: 'POST',
      body: { title: 'Manual entry', status: 'idea' },
      cookieHeader,
    });
    const created = await readJson(create, singleEnvelope);
    expect(created.song.mbid).toBe(null);
    expect(created.song.album).toBe(null);
    expect(created.song.durationSeconds).toBe(null);
    expect(created.song.tags).toEqual([]);
    expect(created.song.isrcs).toEqual([]);
  });
});
