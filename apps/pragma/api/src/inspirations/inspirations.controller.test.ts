import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildAuthenticatedApp, jsonRequest, readJson } from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';
import {
  buildInspirationBody,
  buildInspirationChanges,
  createComposition,
  createInspiration,
  createLane,
  errorEnvelope,
  inspirationEnvelope,
  listInspirations,
  placeClip,
  readSketch,
  sendJson,
} from '../../../test/sketch-utils';
import { inspirationTable } from './inspirations.schema';

const inUseEnvelope = z.object({
  error: z.literal('inspiration-in-use'),
  sketches: z.array(z.object({ compositionId: z.guid(), title: z.string() })),
});

// @FollowsBlueprint test-back-e2e
describe('inspirations controller (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  it('rejects every verb without a session cookie', async () => {
    const { app } = await buildAuthenticatedApp();
    const id = randomUUID();
    expect((await jsonRequest(app, '/api/inspirations')).status).toBe(401);
    const post = await jsonRequest(app, '/api/inspirations', {
      method: 'POST',
      body: buildInspirationBody(id),
    });
    expect(post.status).toBe(401);
    const patch = await jsonRequest(app, `/api/inspirations/${id}`, {
      method: 'PATCH',
      body: buildInspirationBody(id),
    });
    expect(patch.status).toBe(401);
    expect((await jsonRequest(app, `/api/inspirations/${id}`, { method: 'DELETE' })).status).toBe(
      401,
    );
  });

  it('adds an inspiration named after its author and lists the library newest first', async () => {
    const band = await buildAuthenticatedApp('Hugo');
    const firstId = await createInspiration(band, { title: 'In the Air Tonight' });
    const secondId = await createInspiration(band, { title: 'Call Me Maybe' });

    const library = await listInspirations(band);

    expect(library.map((inspiration) => inspiration.id)).toEqual([secondId, firstId]);
    expect(library[0]).toEqual(
      expect.objectContaining({
        title: 'Call Me Maybe',
        artist: 'Carly Rae Jepsen',
        deezerAlbumId: '5678',
        startSeconds: 52,
        endSeconds: 64,
        note: 'the trumpet',
        authorMemberId: band.memberId,
        authorName: 'Hugo',
        sketchCount: 0,
      }),
    );
  });

  it('answers the same inspiration when a create is retried with the same id', async () => {
    const band = await buildAuthenticatedApp();
    const body = buildInspirationBody(randomUUID());
    const first = await sendJson(band, 'POST', '/api/inspirations', body);
    const retry = await sendJson(band, 'POST', '/api/inspirations', body);
    expect(first.status).toBe(201);
    expect(retry.status).toBe(201);
    expect((await readJson(retry, inspirationEnvelope)).inspiration.id).toBe(body.id);
    expect(await testDatabase().select().from(inspirationTable)).toHaveLength(1);
  });

  it('refuses an id that is not a YouTube video, an end at the start and a passage of 601 s', async () => {
    const band = await buildAuthenticatedApp();
    const refusedBodies = [
      { ...buildInspirationBody(randomUUID()), youtubeVideoId: 'call-me' },
      buildInspirationBody(randomUUID(), { startSeconds: 64, endSeconds: 64 }),
      buildInspirationBody(randomUUID(), { startSeconds: 0, endSeconds: 601 }),
    ];
    for (const body of refusedBodies) {
      expect((await sendJson(band, 'POST', '/api/inspirations', body)).status).toBe(400);
    }
    expect(await listInspirations(band)).toEqual([]);
  });

  it('edits every field of an inspiration, and a clip placed from it keeps its offset', async () => {
    const band = await buildAuthenticatedApp();
    const inspirationId = await createInspiration(band);
    const compositionId = await createComposition(band);
    const laneId = await createLane(band, compositionId);
    await placeClip(band, { compositionId, laneId, inspirationId, offsetSeconds: 12 });

    const edited = {
      ...buildInspirationChanges({ title: 'Call Me Maybe (live)' }),
      youtubeVideoId: 'fWNaR-rxAic',
      artist: 'CRJ',
      deezerTrackId: null,
      deezerAlbumId: null,
      startSeconds: 40,
      endSeconds: 70,
      note: 'the whole chorus',
    };
    const response = await sendJson(band, 'PATCH', `/api/inspirations/${inspirationId}`, edited);

    expect(response.status).toBe(200);
    expect((await readJson(response, inspirationEnvelope)).inspiration).toEqual(
      expect.objectContaining({ ...edited, id: inspirationId, sketchCount: 1 }),
    );
    expect((await readSketch(band, compositionId)).clips).toEqual([
      expect.objectContaining({ inspirationId, laneId, offsetSeconds: 12 }),
    ]);
  });

  it('refuses an edit whose passage the create would refuse', async () => {
    const band = await buildAuthenticatedApp();
    const inspirationId = await createInspiration(band);
    const fields = buildInspirationChanges({ startSeconds: 70, endSeconds: 40 });
    const response = await sendJson(band, 'PATCH', `/api/inspirations/${inspirationId}`, fields);
    expect(response.status).toBe(400);
    expect(await listInspirations(band)).toEqual([
      expect.objectContaining({ startSeconds: 52, endSeconds: 64 }),
    ]);
  });

  it('refuses to edit an inspiration another member deleted meanwhile', async () => {
    const band = await buildAuthenticatedApp();
    const inspirationId = await createInspiration(band);
    await sendJson(band, 'DELETE', `/api/inspirations/${inspirationId}`);
    const fields = buildInspirationChanges();

    const response = await sendJson(band, 'PATCH', `/api/inspirations/${inspirationId}`, fields);

    expect(response.status).toBe(404);
    expect(await readJson(response, errorEnvelope)).toEqual({ error: 'inspiration-not-found' });
    expect(await listInspirations(band)).toEqual([]);
  });

  it('refuses to delete an inspiration a sketch uses and names that sketch', async () => {
    const band = await buildAuthenticatedApp();
    const inspirationId = await createInspiration(band);
    const compositionId = await createComposition(band, 'New 7');
    const laneId = await createLane(band, compositionId);
    await placeClip(band, { compositionId, laneId, inspirationId });

    const response = await sendJson(band, 'DELETE', `/api/inspirations/${inspirationId}`);

    expect(response.status).toBe(409);
    expect(await readJson(response, inUseEnvelope)).toEqual({
      error: 'inspiration-in-use',
      sketches: [{ compositionId, title: 'New 7' }],
    });
    expect(await listInspirations(band)).toHaveLength(1);
  });

  it('deletes an unused inspiration once, then answers that it is not found', async () => {
    const band = await buildAuthenticatedApp();
    const inspirationId = await createInspiration(band);

    const first = await sendJson(band, 'DELETE', `/api/inspirations/${inspirationId}`);
    const second = await sendJson(band, 'DELETE', `/api/inspirations/${inspirationId}`);

    expect(first.status).toBe(200);
    expect(second.status).toBe(404);
    expect(await readJson(second, errorEnvelope)).toEqual({ error: 'inspiration-not-found' });
    expect(await listInspirations(band)).toEqual([]);
  });

  it('counts the sketches using an inspiration, two clips of one sketch as one', async () => {
    const band = await buildAuthenticatedApp();
    const inspirationId = await createInspiration(band);
    const firstCompositionId = await createComposition(band, 'New 7');
    const secondCompositionId = await createComposition(band, 'New 8');
    const firstLaneId = await createLane(band, firstCompositionId);
    const secondLaneId = await createLane(band, secondCompositionId);
    await placeClip(band, {
      compositionId: firstCompositionId,
      laneId: firstLaneId,
      inspirationId,
    });
    await placeClip(band, {
      compositionId: firstCompositionId,
      laneId: firstLaneId,
      inspirationId,
      offsetSeconds: 30,
    });
    await placeClip(band, {
      compositionId: secondCompositionId,
      laneId: secondLaneId,
      inspirationId,
    });

    expect(await listInspirations(band)).toEqual([expect.objectContaining({ sketchCount: 2 })]);
  });
});
