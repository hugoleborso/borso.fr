import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildTestContext, requestJson, signIn } from '../../../test/app-utils';
import { CONTENT_FIXTURE } from '../../../test/content-fixture';
import { truncateAllTables } from '../../../test/database-utils';

beforeEach(async () => {
  await truncateAllTables();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-05T08:00:00Z'));
  return () => {
    vi.useRealTimers();
  };
});

// @FollowsBlueprint test-back-e2e
describe('GET /api/relations', () => {
  it('answers the people to reconnect with and the birthdays, counted from today', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, '/api/relations', { cookie: await signIn() });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      generatedAt: '2026-10-04T03:03:00+02:00',
      toReconnect: [
        {
          page: 'second-brain/personnes/alice-martin',
          title: 'Alice Martin',
          closeness: 4,
          lastContactOn: '2026-08-25',
          silentDays: 41,
        },
      ],
      birthdays: [
        {
          page: 'second-brain/personnes/bruno-petit',
          title: 'Bruno Petit',
          date: '2026-10-07',
          daysUntil: 2,
          age: 41,
        },
        {
          page: 'second-brain/personnes/claire-roux',
          title: 'Claire Roux',
          date: '2026-10-15',
          daysUntil: 10,
          age: null,
        },
      ],
    });
  });

  it('answers empty lists when the file is missing', async () => {
    const { app } = buildTestContext({});
    const response = await requestJson(app, '/api/relations', { cookie: await signIn() });
    expect(await response.json()).toEqual({ generatedAt: null, toReconnect: [], birthdays: [] });
  });

  it('refuses a request without a session', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    expect((await requestJson(app, '/api/relations')).status).toBe(401);
  });
});
