import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildAuthenticatedApp, jsonRequest, readJson } from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';

type TestApp = Awaited<ReturnType<typeof buildAuthenticatedApp>>['app'];

const streaksEnvelope = z
  .object({
    today: z.string(),
    mine: z
      .object({ days: z.number(), isTodayCounted: z.boolean(), jokersLeftThisWeek: z.number() })
      .strict(),
    band: z.object({ days: z.number(), isTodayCounted: z.boolean() }).strict(),
  })
  .strict();

const NO_FLAME = { days: 0, isTodayCounted: false, jokersLeftThisWeek: 3 };
const COUNTED_TODAY = { days: 1, isTodayCounted: true, jokersLeftThisWeek: 3 };

async function readStreaks(app: TestApp, cookieHeader: string) {
  return await readJson(await jsonRequest(app, '/api/streaks', { cookieHeader }), streaksEnvelope);
}

const SESSION_OF_KIND = {
  practice: { kind: 'practice' },
  concert: { kind: 'concert', venue: 'Le Petit Bain', capacity: 150 },
} as const;

async function planSession(app: TestApp, cookieHeader: string, kind: 'practice' | 'concert') {
  const response = await jsonRequest(app, '/api/sessions', {
    method: 'POST',
    body: { ...SESSION_OF_KIND[kind], date: new Date().toISOString() },
    cookieHeader,
  });
  expect(response.status).toBe(201);
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

  it('leaves today open when the member opens the app on a day with no session', async () => {
    const { app, cookieHeader } = await buildAuthenticatedApp();

    expect((await jsonRequest(app, '/api/me', { cookieHeader })).status).toBe(200);
    const streaks = await readStreaks(app, cookieHeader);

    expect(streaks.mine).toEqual(NO_FLAME);
    expect(streaks.band).toEqual({ days: 0, isTodayCounted: false });
  });

  it.each(['practice', 'concert'] as const)(
    'counts today for me and the band when a %s is dated today',
    async (kind) => {
      const { app, cookieHeader } = await buildAuthenticatedApp();
      await planSession(app, cookieHeader, kind);

      const streaks = await readStreaks(app, cookieHeader);

      expect(streaks.mine).toEqual(COUNTED_TODAY);
      expect(streaks.band).toEqual({ days: 1, isTodayCounted: true });
    },
  );
});
