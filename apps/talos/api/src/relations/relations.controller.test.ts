import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildTestContext, requestJson, signIn } from '../../../test/app-utils';
import { truncateAllTables } from '../../../test/database-utils';
import { seedMemoryInDatabase } from '../../../test/memory-fixture';

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
  it('reads the stored relations state, counted from today', async () => {
    await seedMemoryInDatabase();
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/relations', { cookie: await signIn() });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      generatedAt: '2026-10-05T03:00:00+02:00',
      toReconnect: [
        {
          page: 'second-brain/personnes/alice-martin',
          title: 'Alice Martin',
          closeness: 4,
          lastContactOn: '2026-08-29',
          silentDays: 37,
        },
      ],
      birthdays: [],
    });
  });

  it('answers empty lists when the state is missing', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/relations', { cookie: await signIn() });
    expect(await response.json()).toEqual({ generatedAt: null, toReconnect: [], birthdays: [] });
  });

  it('refuses a request without a session', async () => {
    const { app } = buildTestContext();
    expect((await requestJson(app, '/api/relations')).status).toBe(401);
  });
});
