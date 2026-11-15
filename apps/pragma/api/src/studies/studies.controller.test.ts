import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildAuthenticatedApp, jsonRequest, readJson } from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';
import { masteryScoreChangeTable } from '../mastery/mastery.schema';
import { studyTable } from './studies.schema';

type TestApp = Awaited<ReturnType<typeof buildAuthenticatedApp>>['app'];

const idEnvelope = (key: string) => z.object({ [key]: z.object({ id: z.guid() }) });

const overviewSchema = z.object({
  today: z.string(),
  queue: z.array(
    z.object({
      songId: z.string(),
      instrumentId: z.string(),
      score: z.number().nullable(),
      isReady: z.boolean().nullable(),
      isStudiedToday: z.boolean(),
    }),
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
): Promise<{ songId: string; instrumentId: string }> {
  const instrumentId = await createId(app, cookieHeader, '/api/instruments', 'instrument', {
    name: 'Guitar',
    family: 'harmonic',
  });
  const songId = await createId(app, cookieHeader, '/api/songs', 'song', {
    title: 'Song',
    status: 'idea',
    defaultLineup: { [memberId]: [instrumentId] },
  });
  return { songId, instrumentId };
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

  it('answers no readiness when no concert is coming', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const overview = await readOverview(app, cookieHeader);
    expect(overview.readiness).toBeNull();
  });

  it('removes studies and score history with the song', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();
    const { songId, instrumentId } = await seedSongPlayedBy(app, cookieHeader, memberId);
    await testDatabase().insert(studyTable).values({
      memberId,
      songId,
      instrumentId,
      studiedOn: '2026-10-12',
      createdAt: new Date(),
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
