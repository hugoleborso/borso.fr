import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildAuthenticatedApp, jsonRequest, readJson } from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';
import { masteryScoreChangeTable } from '../mastery/mastery.schema';
import { studyTable } from './studies.schema';

type TestApp = Awaited<ReturnType<typeof buildAuthenticatedApp>>['app'];

const idEnvelope = (key: string) => z.object({ [key]: z.object({ id: z.string().uuid() }) });

const streakSchema = z.object({
  days: z.number(),
  isTodayCounted: z.boolean(),
  isJokerAvailable: z.boolean(),
});

const overviewSchema = z.object({
  today: z.string(),
  myStreak: streakSchema,
  queue: z.array(
    z.object({
      songId: z.string(),
      instrumentId: z.string(),
      score: z.number().nullable(),
      isReady: z.boolean().nullable(),
      isStudiedToday: z.boolean(),
    }),
  ),
  band: z.array(
    z.object({ memberId: z.string(), streak: streakSchema, studiesThisWeek: z.number() }),
  ),
  readiness: z
    .object({
      concertId: z.string(),
      songs: z.array(z.object({ songId: z.string(), isReady: z.boolean() })),
    })
    .nullable(),
});

const FUTURE_CONCERT_DATE = '2099-06-21T20:00:00.000Z';

async function createId(
  app: TestApp,
  cookieHeader: string,
  path: string,
  key: string,
  body: unknown,
): Promise<string> {
  const response = await jsonRequest(app, path, { method: 'POST', body, cookieHeader });
  const envelope = await readJson(response, idEnvelope(key));
  const created = envelope[key];
  if (created === undefined) throw new Error(`no ${key} in the response`);
  return created.id;
}

async function seedSongPlayedBy(
  app: TestApp,
  cookieHeader: string,
  memberId: string,
): Promise<{ songId: string; instrumentId: string; otherInstrumentId: string }> {
  const instrumentId = await createId(app, cookieHeader, '/api/instruments', 'instrument', {
    name: 'Guitar',
    family: 'harmonic',
  });
  const otherInstrumentId = await createId(app, cookieHeader, '/api/instruments', 'instrument', {
    name: 'Voice',
    family: 'vocal',
  });
  const songId = await createId(app, cookieHeader, '/api/songs', 'song', {
    title: 'Song',
    status: 'idea',
    defaultLineup: { [memberId]: [instrumentId] },
  });
  return { songId, instrumentId, otherInstrumentId };
}

async function readOverview(app: TestApp, cookieHeader: string) {
  return await readJson(
    await jsonRequest(app, '/api/studies/overview', { cookieHeader }),
    overviewSchema,
  );
}

// @FollowsBlueprint test-back-e2e
describe('studies controller (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  it('rejects a request without a session cookie', async () => {
    const { app } = await buildAuthenticatedApp();
    expect((await jsonRequest(app, '/api/studies/overview')).status).toBe(401);
  });

  it('logs a study once per day and counts it in the streak', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();
    const { songId, instrumentId } = await seedSongPlayedBy(app, cookieHeader, memberId);

    const first = await jsonRequest(app, '/api/studies', {
      method: 'POST',
      body: { songId, instrumentId },
      cookieHeader,
    });
    const second = await jsonRequest(app, '/api/studies', {
      method: 'POST',
      body: { songId, instrumentId },
      cookieHeader,
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(await testDatabase().select().from(studyTable)).toHaveLength(1);
    const overview = await readOverview(app, cookieHeader);
    expect(overview.myStreak).toEqual({ days: 1, isTodayCounted: true, isJokerAvailable: true });
    expect(overview.queue).toEqual([
      { songId, instrumentId, score: null, isReady: null, isStudiedToday: true },
    ]);
  });

  it('refuses a body carrying a date, so a study cannot be back-dated', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();
    const { songId, instrumentId } = await seedSongPlayedBy(app, cookieHeader, memberId);
    const response = await jsonRequest(app, '/api/studies', {
      method: 'POST',
      body: { songId, instrumentId, studiedOn: '2020-01-01' },
      cookieHeader,
    });
    expect(response.status).toBe(400);
  });

  it('refuses an instrument the member does not hold in the song lineup', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();
    const { songId, otherInstrumentId } = await seedSongPlayedBy(app, cookieHeader, memberId);
    const response = await jsonRequest(app, '/api/studies', {
      method: 'POST',
      body: { songId, instrumentId: otherInstrumentId },
      cookieHeader,
    });
    expect(response.status).toBe(422);
  });

  it('accepts an instrument held only through a setlist lineup override', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();
    const { songId, otherInstrumentId } = await seedSongPlayedBy(app, cookieHeader, memberId);
    const setlistId = await createId(app, cookieHeader, '/api/setlists', 'setlist', {
      name: 'Set',
    });
    await jsonRequest(app, `/api/setlists/${setlistId}/entries`, {
      method: 'POST',
      body: { songId, lineupOverride: { [memberId]: [otherInstrumentId] } },
      cookieHeader,
    });
    const response = await jsonRequest(app, '/api/studies', {
      method: 'POST',
      body: { songId, instrumentId: otherInstrumentId },
      cookieHeader,
    });
    expect(response.status).toBe(201);
  });

  it('answers 404 for an unknown song', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const missing = '11111111-1111-1111-1111-111111111111';
    const response = await jsonRequest(app, '/api/studies', {
      method: 'POST',
      body: { songId: missing, instrumentId: missing },
      cookieHeader,
    });
    expect(response.status).toBe(404);
  });

  it('answers 404 for an unknown instrument', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();
    const { songId } = await seedSongPlayedBy(app, cookieHeader, memberId);
    const response = await jsonRequest(app, '/api/studies', {
      method: 'POST',
      body: { songId, instrumentId: '22222222-2222-2222-2222-222222222222' },
      cookieHeader,
    });
    expect(response.status).toBe(404);
  });

  it('refuses to undo another member study of today', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();
    const { songId, instrumentId } = await seedSongPlayedBy(app, cookieHeader, memberId);
    const otherMemberId = await createId(app, cookieHeader, '/api/members', 'member', {
      firstName: 'Other',
      color: '#abc',
    });
    const overview = await readOverview(app, cookieHeader);
    await testDatabase().insert(studyTable).values({
      memberId: otherMemberId,
      songId,
      instrumentId,
      studiedOn: overview.today,
      createdAt: new Date(),
    });
    const response = await jsonRequest(app, `/api/studies/${songId}/${instrumentId}`, {
      method: 'DELETE',
      cookieHeader,
    });
    expect(response.status).toBe(404);
    expect(await testDatabase().select().from(studyTable)).toHaveLength(1);
  });

  it('undoes my own study of today and refuses one that is not there', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();
    const { songId, instrumentId } = await seedSongPlayedBy(app, cookieHeader, memberId);
    await jsonRequest(app, '/api/studies', {
      method: 'POST',
      body: { songId, instrumentId },
      cookieHeader,
    });
    const undone = await jsonRequest(app, `/api/studies/${songId}/${instrumentId}`, {
      method: 'DELETE',
      cookieHeader,
    });
    const again = await jsonRequest(app, `/api/studies/${songId}/${instrumentId}`, {
      method: 'DELETE',
      cookieHeader,
    });
    expect(undone.status).toBe(200);
    expect(
      await readJson(
        undone,
        z.object({ myLine: z.object({ streak: streakSchema, studiesThisWeek: z.number() }) }),
      ),
    ).toEqual({
      myLine: {
        streak: { days: 0, isTodayCounted: false, isJokerAvailable: true },
        studiesThisWeek: 0,
      },
    });
    expect(again.status).toBe(404);
  });

  it('refuses to undo a study of yesterday', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();
    const { songId, instrumentId } = await seedSongPlayedBy(app, cookieHeader, memberId);
    await testDatabase()
      .insert(studyTable)
      .values({ memberId, songId, instrumentId, studiedOn: '2020-01-01', createdAt: new Date() });
    const response = await jsonRequest(app, `/api/studies/${songId}/${instrumentId}`, {
      method: 'DELETE',
      cookieHeader,
    });
    expect(response.status).toBe(404);
  });

  it('reports the next concert readiness, moved by a per-song score', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();
    const { songId, instrumentId } = await seedSongPlayedBy(app, cookieHeader, memberId);
    const concertId = await createId(app, cookieHeader, '/api/sessions', 'session', {
      kind: 'concert',
      date: FUTURE_CONCERT_DATE,
      venue: 'Bar',
      capacity: 50,
    });
    const setlistId = await createId(app, cookieHeader, '/api/setlists', 'setlist', {
      name: 'Set',
      sessionId: concertId,
    });
    await jsonRequest(app, `/api/setlists/${setlistId}/entries`, {
      method: 'POST',
      body: { songId },
      cookieHeader,
    });

    const before = await readOverview(app, cookieHeader);
    await jsonRequest(app, '/api/mastery/overrides', {
      method: 'PUT',
      body: { memberId, instrumentId, songId, score: 7 },
      cookieHeader,
    });
    const after = await readOverview(app, cookieHeader);

    expect(before.readiness).toEqual({ concertId, songs: [{ songId, isReady: false }] });
    expect(after.readiness?.songs).toEqual([{ songId, isReady: true }]);
    expect(after.queue[0]?.score).toBe(7);
  });

  it('counts the songs of every setlist linked to the next concert, once each', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();
    const { songId, instrumentId } = await seedSongPlayedBy(app, cookieHeader, memberId);
    const secondSongId = await createId(app, cookieHeader, '/api/songs', 'song', {
      title: 'Second',
      status: 'idea',
      defaultLineup: { [memberId]: [instrumentId] },
    });
    const concertId = await createId(app, cookieHeader, '/api/sessions', 'session', {
      kind: 'concert',
      date: FUTURE_CONCERT_DATE,
      venue: 'Bar',
      capacity: 50,
    });
    for (const songIds of [[songId], [songId, secondSongId]]) {
      const setlistId = await createId(app, cookieHeader, '/api/setlists', 'setlist', {
        name: 'Set',
        sessionId: concertId,
      });
      for (const entrySongId of songIds) {
        await jsonRequest(app, `/api/setlists/${setlistId}/entries`, {
          method: 'POST',
          body: { songId: entrySongId },
          cookieHeader,
        });
      }
    }
    const overview = await readOverview(app, cookieHeader);
    expect(overview.readiness?.songs.map((song) => song.songId).sort()).toEqual(
      [songId, secondSongId].sort(),
    );
  });

  it('lists every band member with a streak', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();
    const overview = await readOverview(app, cookieHeader);
    expect(overview.band.map((member) => member.memberId)).toEqual([memberId]);
    expect(overview.readiness).toBeNull();
  });

  it('removes studies and score history with the song', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();
    const { songId, instrumentId } = await seedSongPlayedBy(app, cookieHeader, memberId);
    await jsonRequest(app, '/api/studies', {
      method: 'POST',
      body: { songId, instrumentId },
      cookieHeader,
    });
    await jsonRequest(app, '/api/mastery/overrides', {
      method: 'PUT',
      body: { memberId, instrumentId, songId, score: 4 },
      cookieHeader,
    });
    await jsonRequest(app, `/api/songs/${songId}`, { method: 'DELETE', cookieHeader });

    expect(await testDatabase().select().from(studyTable)).toHaveLength(0);
    expect(await testDatabase().select().from(masteryScoreChangeTable)).toHaveLength(0);
  });

  it('removes studies and score history with the member', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();
    const { songId, instrumentId } = await seedSongPlayedBy(app, cookieHeader, memberId);
    const otherMemberId = await createId(app, cookieHeader, '/api/members', 'member', {
      firstName: 'Other',
      color: '#abc',
    });
    await testDatabase().insert(studyTable).values({
      memberId: otherMemberId,
      songId,
      instrumentId,
      studiedOn: '2026-10-12',
      createdAt: new Date(),
    });
    await jsonRequest(app, '/api/mastery/overrides', {
      method: 'PUT',
      body: { memberId: otherMemberId, instrumentId, songId, score: 4 },
      cookieHeader,
    });
    await jsonRequest(app, `/api/members/${otherMemberId}`, { method: 'DELETE', cookieHeader });

    expect(await testDatabase().select().from(studyTable)).toHaveLength(0);
    expect(await testDatabase().select().from(masteryScoreChangeTable)).toHaveLength(0);
  });
});
