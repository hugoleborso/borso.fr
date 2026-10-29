import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  buildAuthenticatedApp,
  createMemberDirectly,
  jsonRequest,
  readJson,
} from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';

type TestApp = Awaited<ReturnType<typeof buildAuthenticatedApp>>['app'];

const personalFlameSchema = z
  .object({ days: z.number(), isTodayCounted: z.boolean(), jokersLeftThisWeek: z.number() })
  .strict();
const streaksEnvelope = z
  .object({
    today: z.string(),
    mine: personalFlameSchema,
    band: z.object({ days: z.number(), isTodayCounted: z.boolean() }).strict(),
    members: z.array(
      z
        .object({
          memberId: z.string().uuid(),
          firstName: z.string(),
          color: z.string(),
          flame: personalFlameSchema,
        })
        .strict(),
    ),
  })
  .strict();
const idEnvelope = (key: string) => z.object({ [key]: z.object({ id: z.string().uuid() }) });

const COUNTED_TODAY = { days: 1, isTodayCounted: true, jokersLeftThisWeek: 3 };
const NO_FLAME = { days: 0, isTodayCounted: false, jokersLeftThisWeek: 3 };

async function createId(
  app: TestApp,
  cookieHeader: string,
  path: string,
  key: string,
  body: unknown,
): Promise<string> {
  const response = await jsonRequest(app, path, { method: 'POST', body, cookieHeader });
  const created = (await readJson(response, idEnvelope(key)))[key];
  if (created === undefined) throw new Error(`no ${key} in the response`);
  return created.id;
}

async function seedSongPlayedBy(app: TestApp, cookieHeader: string, memberId: string) {
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

async function readStreaks(app: TestApp, cookieHeader: string) {
  return await readJson(await jsonRequest(app, '/api/streaks', { cookieHeader }), streaksEnvelope);
}

// @FollowsBlueprint test-back-e2e
describe('streaks controller (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  it('rejects a request without a session cookie', async () => {
    const { app } = await buildAuthenticatedApp();
    expect((await jsonRequest(app, '/api/streaks')).status).toBe(401);
  });

  it('counts today after a study and drops it after the undo', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();
    const study = await seedSongPlayedBy(app, cookieHeader, memberId);

    await jsonRequest(app, '/api/studies', { method: 'POST', body: study, cookieHeader });
    const afterStudy = await readStreaks(app, cookieHeader);
    await jsonRequest(app, `/api/studies/${study.songId}/${study.instrumentId}`, {
      method: 'DELETE',
      cookieHeader,
    });
    const afterUndo = await readStreaks(app, cookieHeader);

    expect(afterStudy.mine).toEqual(COUNTED_TODAY);
    expect(afterStudy.band).toEqual({ days: 1, isTodayCounted: true });
    expect(afterUndo.mine).toEqual(NO_FLAME);
    expect(afterUndo.band).toEqual({ days: 0, isTodayCounted: false });
  });

  it('counts every member’s day when a session is dated today', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    await createMemberDirectly(app, 'Léa');
    const sessionResponse = await jsonRequest(app, '/api/sessions', {
      method: 'POST',
      body: { kind: 'practice', date: new Date().toISOString() },
      cookieHeader,
    });
    expect(sessionResponse.status).toBe(201);

    const streaks = await readStreaks(app, cookieHeader);

    expect(streaks.mine).toEqual(COUNTED_TODAY);
    expect(streaks.band).toEqual({ days: 1, isTodayCounted: true });
    expect(streaks.members.map((member) => member.flame)).toEqual([COUNTED_TODAY, COUNTED_TODAY]);
  });

  it('lists each member with their stored colour', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();
    const leaId = await createMemberDirectly(app, 'Léa');

    const streaks = await readStreaks(app, cookieHeader);

    expect(streaks.members).toEqual([
      { memberId: leaId, firstName: 'Léa', color: '#ff8a65', flame: NO_FLAME },
      expect.objectContaining({ memberId, flame: NO_FLAME }),
    ]);
  });
});
