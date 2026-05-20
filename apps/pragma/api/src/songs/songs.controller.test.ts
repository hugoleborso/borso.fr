/**
 * Back-e2e for the catalog endpoints. Covers auth gating, CRUD + the
 * three chord-chart variants (chordpro / pdf / image) + a cascade
 * delete that also removes the song's mastery overrides.
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
  links: z.unknown(),
  chart: z.union([
    z.object({ kind: z.literal('chordpro'), text: z.string() }),
    z.object({ kind: z.literal('pdf'), s3Key: z.string() }),
    z.object({ kind: z.literal('image'), s3Key: z.string() }),
    z.null(),
  ]),
  tonalityStart: z.string().nullable(),
  tonalityEnd: z.string().nullable(),
  defaultLineup: z.unknown(),
  baseEnergy: z.number().nullable(),
  createdAt: z.string(),
});
const singleEnvelope = z.object({ song: songSchema });
const listEnvelope = z.object({ songs: z.array(songSchema) });

const masteryOverrideSchema = z.object({
  memberId: z.string().uuid(),
  instrumentId: z.string().uuid(),
  songId: z.string().uuid(),
  score: z.number(),
});
const overridesEnvelope = z.object({ overrides: z.array(masteryOverrideSchema) });

describe('songs controller (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  it('rejects every verb without a session cookie', async () => {
    const { app } = await buildAuthenticatedApp();
    const list = await jsonRequest(app, '/api/songs');
    expect(list.status).toBe(401);
  });

  it('creates, reads, updates and deletes a song', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const create = await jsonRequest(app, '/api/songs', {
      method: 'POST',
      body: {
        title: 'Happy',
        artist: 'Pharrell Williams',
        status: 'concert_ready',
        tonalityStart: 'F',
        tonalityEnd: 'F',
        baseEnergy: 8,
      },
      cookieHeader,
    });
    expect(create.status).toBe(201);
    const created = await readJson(create, singleEnvelope);
    expect(created.song.title).toBe('Happy');

    const get = await jsonRequest(app, `/api/songs/${created.song.id}`, { cookieHeader });
    const fetched = await readJson(get, singleEnvelope);
    expect(fetched.song.artist).toBe('Pharrell Williams');

    const list = await jsonRequest(app, '/api/songs', { cookieHeader });
    const listed = await readJson(list, listEnvelope);
    expect(listed.songs).toHaveLength(1);

    const update = await jsonRequest(app, `/api/songs/${created.song.id}`, {
      method: 'PUT',
      body: { status: 'rehearsed' },
      cookieHeader,
    });
    expect(update.status).toBe(200);
    const updated = await readJson(update, singleEnvelope);
    expect(updated.song.status).toBe('rehearsed');

    const remove = await jsonRequest(app, `/api/songs/${created.song.id}`, {
      method: 'DELETE',
      cookieHeader,
    });
    expect(remove.status).toBe(200);

    const afterDelete = await jsonRequest(app, '/api/songs', { cookieHeader });
    const remaining = await readJson(afterDelete, listEnvelope);
    expect(remaining.songs).toHaveLength(0);
  });

  it('persists each of the three chord-chart variants', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const chordpro = await jsonRequest(app, '/api/songs', {
      method: 'POST',
      body: {
        title: 'A',
        status: 'idea',
        chart: { kind: 'chordpro', text: '[C]Hello' },
      },
      cookieHeader,
    });
    const chordproSong = await readJson(chordpro, singleEnvelope);
    expect(chordproSong.song.chart).toEqual({ kind: 'chordpro', text: '[C]Hello' });

    const pdf = await jsonRequest(app, '/api/songs', {
      method: 'POST',
      body: {
        title: 'B',
        status: 'idea',
        chart: { kind: 'pdf', s3Key: 'chord-charts/abc.pdf' },
      },
      cookieHeader,
    });
    const pdfSong = await readJson(pdf, singleEnvelope);
    expect(pdfSong.song.chart).toEqual({ kind: 'pdf', s3Key: 'chord-charts/abc.pdf' });

    const image = await jsonRequest(app, '/api/songs', {
      method: 'POST',
      body: {
        title: 'C',
        status: 'idea',
        chart: { kind: 'image', s3Key: 'chord-charts/def.png' },
      },
      cookieHeader,
    });
    const imageSong = await readJson(image, singleEnvelope);
    expect(imageSong.song.chart).toEqual({ kind: 'image', s3Key: 'chord-charts/def.png' });
  });

  it('cascades the mastery overrides on song delete', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const memberRes = await jsonRequest(app, '/api/members', {
      method: 'POST',
      body: { firstName: 'Hugo', color: '#abc' },
      cookieHeader,
    });
    const memberId = (await readJson(memberRes, z.object({ member: z.object({ id: z.string().uuid() }) }))).member.id;
    const instrumentRes = await jsonRequest(app, '/api/instruments', {
      method: 'POST',
      body: { name: 'Voice', isHarmonic: false },
      cookieHeader,
    });
    const instrumentId = (
      await readJson(instrumentRes, z.object({ instrument: z.object({ id: z.string().uuid() }) }))
    ).instrument.id;
    const songRes = await jsonRequest(app, '/api/songs', {
      method: 'POST',
      body: { title: 'X', status: 'idea' },
      cookieHeader,
    });
    const songId = (await readJson(songRes, singleEnvelope)).song.id;

    await jsonRequest(app, '/api/mastery/overrides', {
      method: 'PUT',
      body: { memberId, instrumentId, songId, score: 8 },
      cookieHeader,
    });

    const overridesBefore = await readJson(
      await jsonRequest(app, `/api/mastery/overrides/${songId}`, { cookieHeader }),
      overridesEnvelope,
    );
    expect(overridesBefore.overrides).toHaveLength(1);

    await jsonRequest(app, `/api/songs/${songId}`, { method: 'DELETE', cookieHeader });

    const overridesAfter = await readJson(
      await jsonRequest(app, `/api/mastery/overrides/${songId}`, { cookieHeader }),
      overridesEnvelope,
    );
    expect(overridesAfter.overrides).toHaveLength(0);
  });

  it('returns 404 on get / update / delete of a missing id', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const missing = '11111111-1111-1111-1111-111111111111';
    expect((await jsonRequest(app, `/api/songs/${missing}`, { cookieHeader })).status).toBe(404);
    expect(
      (
        await jsonRequest(app, `/api/songs/${missing}`, {
          method: 'PUT',
          body: { title: 'x' },
          cookieHeader,
        })
      ).status,
    ).toBe(404);
    expect(
      (await jsonRequest(app, `/api/songs/${missing}`, { method: 'DELETE', cookieHeader })).status,
    ).toBe(404);
  });
});
