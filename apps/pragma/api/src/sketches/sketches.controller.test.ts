import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { buildAuthenticatedApp, jsonRequest, readJson } from '../../../test/auth-utils';
import {
  holdWritesToTable,
  runSecondWhileFirstWaitsOnHold,
  testDatabase,
  truncateAllTables,
} from '../../../test/database-utils';
import {
  clipEnvelope,
  createComposition,
  createInspiration,
  createLane,
  errorEnvelope,
  laneEnvelope,
  placeClip,
  postClip,
  readSketch,
  sendJson,
} from '../../../test/sketch-utils';
import { inspirationTable } from '../inspirations/inspirations.schema';
import { sketchClipTable, sketchLaneTable } from './sketches.schema';

// @FollowsBlueprint test-back-e2e
describe('sketches controller (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  it('rejects every verb without a session cookie', async () => {
    const { app } = await buildAuthenticatedApp();
    const songId = randomUUID();
    const laneId = randomUUID();
    const clipId = randomUUID();
    const requests = [
      { method: 'POST', path: `/api/sketches/${songId}/lanes` },
      { method: 'PATCH', path: `/api/sketches/${songId}/lanes/${laneId}` },
      { method: 'DELETE', path: `/api/sketches/${songId}/lanes/${laneId}` },
      { method: 'POST', path: `/api/sketches/${songId}/clips` },
      { method: 'PATCH', path: `/api/sketches/${songId}/clips/${clipId}` },
      { method: 'DELETE', path: `/api/sketches/${songId}/clips/${clipId}` },
    ] as const;
    expect((await jsonRequest(app, `/api/sketches/${songId}`)).status).toBe(401);
    for (const request of requests) {
      const response = await jsonRequest(app, request.path, { method: request.method, body: {} });
      expect(response.status).toBe(401);
    }
  });

  it('reads an empty sketch for a composition and answers 404 for a song that does not exist', async () => {
    const band = await buildAuthenticatedApp();
    const songId = await createComposition(band);
    expect(await readSketch(band, songId)).toEqual({ songId, lanes: [], clips: [] });
    const missing = await sendJson(band, 'GET', `/api/sketches/${randomUUID()}`);
    expect(missing.status).toBe(404);
    expect(await readJson(missing, errorEnvelope)).toEqual({ error: 'song-not-found' });
  });

  it('adds lanes in their position, renames one and places a clip on it', async () => {
    const band = await buildAuthenticatedApp();
    const songId = await createComposition(band);
    const inspirationId = await createInspiration(band);
    const brassId = randomUUID();
    const drumsId = randomUUID();
    await sendJson(band, 'POST', `/api/sketches/${songId}/lanes`, {
      id: brassId,
      name: 'brass',
      position: 1,
    });
    const added = await sendJson(band, 'POST', `/api/sketches/${songId}/lanes`, {
      id: drumsId,
      name: 'drums',
      position: 0,
    });
    const renamed = await sendJson(band, 'PATCH', `/api/sketches/${songId}/lanes/${drumsId}`, {
      name: 'kit',
    });
    const placed = await postClip(band, {
      songId,
      laneId: drumsId,
      inspirationId,
      offsetSeconds: 4,
    });

    expect(added.status).toBe(201);
    expect((await readJson(added, laneEnvelope)).lane).toEqual({
      id: drumsId,
      songId,
      name: 'drums',
      position: 0,
    });
    expect((await readJson(renamed, laneEnvelope)).lane.name).toBe('kit');
    expect(placed.status).toBe(201);
    const sketch = await readSketch(band, songId);
    expect(sketch.lanes.map((lane) => lane.name)).toEqual(['kit', 'brass']);
    expect(sketch.clips).toEqual([
      expect.objectContaining({ laneId: drumsId, inspirationId, offsetSeconds: 4 }),
    ]);
  });

  it('answers the same clip when a placement is retried with the same id', async () => {
    const band = await buildAuthenticatedApp();
    const songId = await createComposition(band);
    const laneId = await createLane(band, songId);
    const inspirationId = await createInspiration(band);
    const clipId = randomUUID();
    const first = await postClip(band, { songId, laneId, inspirationId }, clipId);
    const retry = await postClip(band, { songId, laneId, inspirationId }, clipId);
    expect(first.status).toBe(201);
    expect((await readJson(retry, clipEnvelope)).clip.id).toBe(clipId);
    expect((await readSketch(band, songId)).clips).toHaveLength(1);
  });

  it('moves a clip in time and onto another lane, and refuses a negative or fractional offset', async () => {
    const band = await buildAuthenticatedApp();
    const songId = await createComposition(band);
    const drumsId = await createLane(band, songId, 'drums');
    const brassId = await createLane(band, songId, 'brass');
    const inspirationId = await createInspiration(band);
    const clipId = await placeClip(band, { songId, laneId: drumsId, inspirationId });

    const moved = await sendJson(band, 'PATCH', `/api/sketches/${songId}/clips/${clipId}`, {
      laneId: brassId,
      offsetSeconds: 4,
    });
    const negative = await sendJson(band, 'PATCH', `/api/sketches/${songId}/clips/${clipId}`, {
      laneId: brassId,
      offsetSeconds: -1,
    });
    const fractional = await sendJson(band, 'PATCH', `/api/sketches/${songId}/clips/${clipId}`, {
      laneId: brassId,
      offsetSeconds: 2.5,
    });

    expect((await readJson(moved, clipEnvelope)).clip).toEqual({
      id: clipId,
      laneId: brassId,
      inspirationId,
      offsetSeconds: 4,
    });
    expect(negative.status).toBe(400);
    expect(fractional.status).toBe(400);
    expect((await readSketch(band, songId)).clips).toEqual([
      expect.objectContaining({ laneId: brassId, offsetSeconds: 4 }),
    ]);
  });

  it('leaves the clip at one of two moves sent at the same moment', async () => {
    const band = await buildAuthenticatedApp();
    const songId = await createComposition(band);
    const laneId = await createLane(band, songId);
    const inspirationId = await createInspiration(band);
    const clipId = await placeClip(band, { songId, laneId, inspirationId });
    const moveTo = async (offsetSeconds: number) =>
      await sendJson(band, 'PATCH', `/api/sketches/${songId}/clips/${clipId}`, {
        laneId,
        offsetSeconds,
      });

    const [firstMove, secondMove] = await runSecondWhileFirstWaitsOnHold(
      holdWritesToTable('sketch_clip'),
      async () => await moveTo(4),
      async () => await moveTo(8),
    );

    expect(firstMove.status).toBe(200);
    expect(secondMove.status).toBe(200);
    const clips = await testDatabase().select().from(sketchClipTable);
    expect(clips).toHaveLength(1);
    expect([4, 8]).toContain(clips[0]?.offsetSeconds);
  });

  it('refuses a clip naming a lane or an inspiration another member deleted, or a lane of another song', async () => {
    const band = await buildAuthenticatedApp();
    const songId = await createComposition(band, 'New 7');
    const otherSongId = await createComposition(band, 'New 8');
    const laneId = await createLane(band, songId);
    const otherLaneId = await createLane(band, otherSongId);
    const inspirationId = await createInspiration(band);
    const deletedInspirationId = await createInspiration(band);
    await sendJson(band, 'DELETE', `/api/inspirations/${deletedInspirationId}`);

    const onDeletedInspiration = await postClip(band, {
      songId,
      laneId,
      inspirationId: deletedInspirationId,
    });
    const onLaneOfOtherSong = await postClip(band, {
      songId,
      laneId: otherLaneId,
      inspirationId,
    });
    const onMissingLane = await postClip(band, { songId, laneId: randomUUID(), inspirationId });

    expect(onDeletedInspiration.status).toBe(404);
    expect(await readJson(onDeletedInspiration, errorEnvelope)).toEqual({
      error: 'inspiration-not-found',
    });
    expect(await readJson(onLaneOfOtherSong, errorEnvelope)).toEqual({ error: 'lane-not-found' });
    expect(await readJson(onMissingLane, errorEnvelope)).toEqual({ error: 'lane-not-found' });
    expect(await testDatabase().select().from(sketchClipTable)).toEqual([]);
  });

  it('refuses to move a clip removed meanwhile, or onto a lane deleted meanwhile', async () => {
    const band = await buildAuthenticatedApp();
    const songId = await createComposition(band);
    const laneId = await createLane(band, songId);
    const deletedLaneId = await createLane(band, songId, 'brass');
    await sendJson(band, 'DELETE', `/api/sketches/${songId}/lanes/${deletedLaneId}`);
    const inspirationId = await createInspiration(band);
    const clipId = await placeClip(band, { songId, laneId, inspirationId });
    const removedClipId = await placeClip(band, { songId, laneId, inspirationId });
    await sendJson(band, 'DELETE', `/api/sketches/${songId}/clips/${removedClipId}`);

    const ontoDeletedLane = await sendJson(
      band,
      'PATCH',
      `/api/sketches/${songId}/clips/${clipId}`,
      {
        laneId: deletedLaneId,
        offsetSeconds: 2,
      },
    );
    const removedMove = await sendJson(
      band,
      'PATCH',
      `/api/sketches/${songId}/clips/${removedClipId}`,
      { laneId, offsetSeconds: 2 },
    );
    const removedAgain = await sendJson(
      band,
      'DELETE',
      `/api/sketches/${songId}/clips/${removedClipId}`,
    );

    expect(await readJson(ontoDeletedLane, errorEnvelope)).toEqual({ error: 'lane-not-found' });
    expect(await readJson(removedMove, errorEnvelope)).toEqual({ error: 'clip-not-found' });
    expect(await readJson(removedAgain, errorEnvelope)).toEqual({ error: 'clip-not-found' });
    expect((await readSketch(band, songId)).clips).toEqual([
      expect.objectContaining({ id: clipId, offsetSeconds: 0 }),
    ]);
  });

  it('deletes a lane with its clips and keeps their inspirations', async () => {
    const band = await buildAuthenticatedApp();
    const songId = await createComposition(band);
    const laneId = await createLane(band, songId);
    const keptLaneId = await createLane(band, songId, 'brass');
    const inspirationId = await createInspiration(band);
    await placeClip(band, { songId, laneId, inspirationId });
    await placeClip(band, { songId, laneId: keptLaneId, inspirationId });

    const deletion = await sendJson(band, 'DELETE', `/api/sketches/${songId}/lanes/${laneId}`);
    const again = await sendJson(band, 'DELETE', `/api/sketches/${songId}/lanes/${laneId}`);
    const renameDeleted = await sendJson(band, 'PATCH', `/api/sketches/${songId}/lanes/${laneId}`, {
      name: 'kit',
    });

    expect(deletion.status).toBe(200);
    expect(await readJson(again, errorEnvelope)).toEqual({ error: 'lane-not-found' });
    expect(await readJson(renameDeleted, errorEnvelope)).toEqual({ error: 'lane-not-found' });
    const sketch = await readSketch(band, songId);
    expect(sketch.lanes.map((lane) => lane.id)).toEqual([keptLaneId]);
    expect(sketch.clips).toEqual([expect.objectContaining({ laneId: keptLaneId })]);
    expect(await testDatabase().select().from(inspirationTable)).toHaveLength(1);
  });

  it('leaves no orphan clip when its inspiration is deleted while it is placed', async () => {
    const band = await buildAuthenticatedApp();
    const songId = await createComposition(band);
    const laneId = await createLane(band, songId);
    const inspirationId = await createInspiration(band);

    const [placement, deletion] = await runSecondWhileFirstWaitsOnHold(
      holdWritesToTable('sketch_clip'),
      async () => await postClip(band, { songId, laneId, inspirationId }),
      async () => await sendJson(band, 'DELETE', `/api/inspirations/${inspirationId}`),
    );

    expect(placement.status).toBe(201);
    expect(deletion.status).toBe(409);
    expect(await testDatabase().select().from(inspirationTable)).toHaveLength(1);
    expect(await testDatabase().select().from(sketchClipTable)).toHaveLength(1);
  });

  it('leaves no orphan clip when its lane is deleted while it is placed', async () => {
    const band = await buildAuthenticatedApp();
    const songId = await createComposition(band);
    const laneId = await createLane(band, songId);
    const inspirationId = await createInspiration(band);

    const [placement, deletion] = await runSecondWhileFirstWaitsOnHold(
      holdWritesToTable('sketch_clip'),
      async () => await postClip(band, { songId, laneId, inspirationId }),
      async () => await sendJson(band, 'DELETE', `/api/sketches/${songId}/lanes/${laneId}`),
    );

    expect(placement.status).toBe(201);
    expect(deletion.status).toBe(200);
    expect(await testDatabase().select().from(sketchLaneTable)).toEqual([]);
    expect(await testDatabase().select().from(sketchClipTable)).toEqual([]);
  });

  it('refuses a lane for a song deleted while the lane was being added', async () => {
    const band = await buildAuthenticatedApp();
    const songId = await createComposition(band);

    const [deletion, addition] = await runSecondWhileFirstWaitsOnHold(
      holdWritesToTable('sketch_lane'),
      async () => await sendJson(band, 'DELETE', `/api/songs/${songId}`),
      async () =>
        await sendJson(band, 'POST', `/api/sketches/${songId}/lanes`, {
          id: randomUUID(),
          name: 'drums',
          position: 0,
        }),
    );

    expect(deletion.status).toBe(200);
    expect(addition.status).toBe(404);
    expect(await readJson(addition, errorEnvelope)).toEqual({ error: 'song-not-found' });
    expect(await testDatabase().select().from(sketchLaneTable)).toEqual([]);
  });
});
