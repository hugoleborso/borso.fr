import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildAuthenticatedApp, jsonRequest, readJson } from '../../../test/auth-utils';
import {
  holdWritesToTable,
  runSecondWhileFirstWaitsOnHold,
  testDatabase,
  truncateAllTables,
} from '../../../test/database-utils';
import {
  compositionEnvelope,
  compositionListEnvelope,
  createComposition,
  createInspiration,
  createLane,
  errorEnvelope,
  listInspirations,
  placeClip,
  readSketch,
  sendJson,
} from '../../../test/sketch-utils';
import { sketchClipTable, sketchLaneTable } from '../sketches/sketches.schema';
import { compositionTable } from './compositions.schema';
import { songTable } from '../songs/songs.schema';

const songEnvelope = z.object({
  song: z.object({
    id: z.guid(),
    title: z.string(),
    artist: z.string(),
    origin: z.string(),
    status: z.string(),
  }),
});

// @FollowsBlueprint test-back-e2e
describe('compositions controller (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  it('rejects every verb without a session cookie', async () => {
    const { app } = await buildAuthenticatedApp();
    const compositionId = randomUUID();
    const requests = [
      { method: 'POST', path: '/api/compositions' },
      { method: 'PATCH', path: `/api/compositions/${compositionId}` },
      { method: 'DELETE', path: `/api/compositions/${compositionId}` },
      { method: 'POST', path: `/api/compositions/${compositionId}/catalogue` },
    ] as const;
    expect((await jsonRequest(app, '/api/compositions')).status).toBe(401);
    for (const request of requests) {
      const response = await jsonRequest(app, request.path, { method: request.method, body: {} });
      expect(response.status).toBe(401);
    }
  });

  it('creates a composition with only a title, lists newest first and renames one', async () => {
    const band = await buildAuthenticatedApp();
    const firstId = randomUUID();
    const created = await sendJson(band, 'POST', '/api/compositions', {
      id: firstId,
      title: '  Composition 1  ',
    });
    const retried = await sendJson(band, 'POST', '/api/compositions', {
      id: firstId,
      title: 'Composition 1',
    });
    const secondId = await createComposition(band, 'Composition 2');

    const renamed = await sendJson(band, 'PATCH', `/api/compositions/${firstId}`, {
      title: 'Avignon Nice',
    });
    const listed = await sendJson(band, 'GET', '/api/compositions');

    expect(created.status).toBe(201);
    expect((await readJson(created, compositionEnvelope)).composition).toEqual({
      id: firstId,
      title: 'Composition 1',
      songId: null,
      createdAt: expect.any(String),
    });
    expect(retried.status).toBe(201);
    expect((await readJson(renamed, compositionEnvelope)).composition.title).toBe('Avignon Nice');
    expect(
      (await readJson(listed, compositionListEnvelope)).compositions.map(({ id, title }) => ({
        id,
        title,
      })),
    ).toEqual([
      { id: secondId, title: 'Composition 2' },
      { id: firstId, title: 'Avignon Nice' },
    ]);
  });

  it('refuses an empty title and answers 404 when renaming a composition that does not exist', async () => {
    const band = await buildAuthenticatedApp();
    const empty = await sendJson(band, 'POST', '/api/compositions', {
      id: randomUUID(),
      title: '   ',
    });
    const missing = await sendJson(band, 'PATCH', `/api/compositions/${randomUUID()}`, {
      title: 'New 7',
    });

    expect(empty.status).toBe(400);
    expect(missing.status).toBe(404);
    expect(await readJson(missing, errorEnvelope)).toEqual({ error: 'composition-not-found' });
  });

  it('deletes a composition with its lanes and clips, and keeps its song and the inspirations', async () => {
    const band = await buildAuthenticatedApp();
    const compositionId = await createComposition(band);
    const keptCompositionId = await createComposition(band, 'New 8');
    const laneId = await createLane(band, compositionId);
    const keptLaneId = await createLane(band, keptCompositionId);
    const inspirationId = await createInspiration(band);
    await placeClip(band, { compositionId, laneId, inspirationId });
    await placeClip(band, { compositionId: keptCompositionId, laneId: keptLaneId, inspirationId });
    await sendJson(band, 'POST', `/api/compositions/${compositionId}/catalogue`);

    const deletion = await sendJson(band, 'DELETE', `/api/compositions/${compositionId}`);
    const again = await sendJson(band, 'DELETE', `/api/compositions/${compositionId}`);

    expect(deletion.status).toBe(200);
    expect(again.status).toBe(404);
    expect(await testDatabase().select().from(sketchLaneTable)).toEqual([
      expect.objectContaining({ id: keptLaneId }),
    ]);
    expect(await testDatabase().select().from(sketchClipTable)).toEqual([
      expect.objectContaining({ laneId: keptLaneId }),
    ]);
    expect(await listInspirations(band)).toEqual([
      expect.objectContaining({ id: inspirationId, sketchCount: 1 }),
    ]);
    expect(await testDatabase().select({ title: songTable.title }).from(songTable)).toEqual([
      { title: 'New 7' },
    ]);
  });

  it('adds a composition to the catalogue as an original idea, and answers the same song when tapped again', async () => {
    const band = await buildAuthenticatedApp();
    const compositionId = await createComposition(band, 'Avignon Nice');

    const first = await sendJson(band, 'POST', `/api/compositions/${compositionId}/catalogue`);
    const second = await sendJson(band, 'POST', `/api/compositions/${compositionId}/catalogue`);
    const firstSongId = (await readJson(first, compositionEnvelope)).composition.songId;
    const secondSongId = (await readJson(second, compositionEnvelope)).composition.songId;
    const song = await sendJson(band, 'GET', `/api/songs/${String(firstSongId)}`);

    expect(first.status).toBe(200);
    expect(secondSongId).toBe(firstSongId);
    expect((await readJson(song, songEnvelope)).song).toEqual({
      id: firstSongId,
      title: 'Avignon Nice',
      artist: '',
      origin: 'original',
      status: 'idea',
    });
    expect((await readSketch(band, compositionId)).composition.songId).toBe(firstSongId);
    expect(await testDatabase().select({ id: songTable.id }).from(songTable)).toHaveLength(1);
  });

  it('keeps one composition when two tabs send the same create at the same moment', async () => {
    const band = await buildAuthenticatedApp();
    const compositionId = randomUUID();
    const create = async () =>
      await sendJson(band, 'POST', '/api/compositions', {
        id: compositionId,
        title: 'Avignon Nice',
      });

    const answers = await runSecondWhileFirstWaitsOnHold(
      holdWritesToTable('composition'),
      create,
      create,
    );

    expect(answers.map((answer) => answer.status)).toEqual([201, 201]);
    const answeredIds = await Promise.all(
      answers.map(async (answer) => (await readJson(answer, compositionEnvelope)).composition.id),
    );
    expect(answeredIds).toEqual([compositionId, compositionId]);
    expect(await testDatabase().select({ id: compositionTable.id }).from(compositionTable)).toEqual(
      [{ id: compositionId }],
    );
  });

  it('creates one song when two members add the same composition at the same moment', async () => {
    const band = await buildAuthenticatedApp();
    const compositionId = await createComposition(band);
    const catalogue = async () =>
      await sendJson(band, 'POST', `/api/compositions/${compositionId}/catalogue`);

    const [first, second] = await runSecondWhileFirstWaitsOnHold(
      holdWritesToTable('song'),
      catalogue,
      catalogue,
    );

    const firstSongId = (await readJson(first, compositionEnvelope)).composition.songId;
    const secondSongId = (await readJson(second, compositionEnvelope)).composition.songId;
    expect(firstSongId).not.toBeNull();
    expect(secondSongId).toBe(firstSongId);
    expect(await testDatabase().select({ id: songTable.id }).from(songTable)).toEqual([
      { id: firstSongId },
    ]);
  });

  it('answers 404 when adding a composition that does not exist to the catalogue', async () => {
    const band = await buildAuthenticatedApp();
    const missing = await sendJson(band, 'POST', `/api/compositions/${randomUUID()}/catalogue`);
    expect(missing.status).toBe(404);
    expect(await readJson(missing, errorEnvelope)).toEqual({ error: 'composition-not-found' });
    expect(await testDatabase().select({ id: songTable.id }).from(songTable)).toEqual([]);
  });
});
