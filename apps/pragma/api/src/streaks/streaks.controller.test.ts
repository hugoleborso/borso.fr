import { parisCalendarDay } from '@domain/paris-day.core';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  buildAuthenticatedApp,
  createMemberDirectly,
  jsonRequest,
  readJson,
} from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';
import { presenceTable } from './streaks.schema';

type TestApp = Awaited<ReturnType<typeof buildAuthenticatedApp>>['app'];

const flameWeekDaySchema = z
  .object({
    day: z.string(),
    state: z.enum(['active', 'joker', 'missed', 'open', 'future']),
    isSessionDay: z.boolean(),
  })
  .strict();
const personalFlameSchema = z
  .object({
    days: z.number(),
    isTodayCounted: z.boolean(),
    jokersLeftThisWeek: z.number(),
    week: z.array(flameWeekDaySchema).length(7),
  })
  .strict();
const streaksEnvelope = z
  .object({
    today: z.string(),
    mine: personalFlameSchema,
    band: z.object({ days: z.number(), isTodayCounted: z.boolean() }).strict(),
    members: z.array(
      z
        .object({
          memberId: z.guid(),
          firstName: z.string(),
          color: z.string(),
          flame: personalFlameSchema,
        })
        .strict(),
    ),
  })
  .strict();

const ANY_WEEK = expect.any(Array);
const COUNTED_TODAY = { days: 1, isTodayCounted: true, jokersLeftThisWeek: 3, week: ANY_WEEK };
const NO_FLAME = { days: 0, isTodayCounted: false, jokersLeftThisWeek: 3, week: ANY_WEEK };

async function readStreaks(app: TestApp, cookieHeader: string) {
  return await readJson(await jsonRequest(app, '/api/streaks', { cookieHeader }), streaksEnvelope);
}

async function readPresencesOf(memberId: string) {
  return await testDatabase()
    .select()
    .from(presenceTable)
    .where(eq(presenceTable.memberId, memberId));
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

  it('counts today once the member opens the app, with one presence for the day', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();

    const first = await readStreaks(app, cookieHeader);
    const second = await readStreaks(app, cookieHeader);

    expect(first.mine).toEqual(COUNTED_TODAY);
    expect(first.band).toEqual({ days: 1, isTodayCounted: true });
    expect(second.mine).toEqual(COUNTED_TODAY);
    expect(await readPresencesOf(memberId)).toHaveLength(1);
  });

  it('records the opening of the app from the signed-in member read', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();

    expect((await jsonRequest(app, '/api/me', { cookieHeader })).status).toBe(200);

    expect(await readPresencesOf(memberId)).toEqual([
      expect.objectContaining({ memberId, presentOn: parisCalendarDay(new Date()) }),
    ]);
  });

  it('removes the presences of a deleted member', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();
    const leaId = await createMemberDirectly(app, 'Léa');
    await testDatabase()
      .insert(presenceTable)
      .values({ memberId: leaId, presentOn: '2026-10-12', createdAt: new Date() });

    await jsonRequest(app, `/api/members/${leaId}`, { method: 'DELETE', cookieHeader });

    expect(await readPresencesOf(leaId)).toEqual([]);
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
    expect(streaks.mine.week).toContainEqual({
      day: streaks.today,
      state: 'active',
      isSessionDay: true,
    });
  });

  it('lists each member with their stored colour', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();
    const leaId = await createMemberDirectly(app, 'Léa');

    const streaks = await readStreaks(app, cookieHeader);

    expect(streaks.members).toEqual([
      { memberId: leaId, firstName: 'Léa', color: '#ff8a65', flame: NO_FLAME },
      expect.objectContaining({ memberId, flame: COUNTED_TODAY }),
    ]);
  });
});
