import { beforeEach, describe, expect, it } from 'vitest';
import { buildTestContext, requestJson, signIn } from '../../../test/app-utils';
import { truncateAllTables } from '../../../test/database-utils';
import { seedMemoryInDatabase } from '../../../test/memory-fixture';

beforeEach(async () => {
  await truncateAllTables();
});

// @FollowsBlueprint test-back-e2e
describe('GET /api/freshness', () => {
  it('reads the stored freshness state', async () => {
    await seedMemoryInDatabase();
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/freshness', { cookie: await signIn() });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      generatedAt: '2026-11-11T20:10:00+01:00',
      lateCount: 7,
      pages: [
        {
          slug: 'second-brain/personnes/alice-martin',
          title: 'Alice Martin',
          kind: 'personne',
          closeness: 4,
          summarizedOn: '2026-10-16',
          factCount: 3,
          containedFactCount: 0,
          lateness: 12,
        },
        {
          slug: 'second-brain/projets/serre',
          title: 'Serre',
          kind: 'projet',
          closeness: 2,
          summarizedOn: '2026-09-12',
          factCount: 4,
          containedFactCount: 20,
          lateness: 48,
        },
      ],
    });
  });

  it('answers nothing late when the state is missing', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/freshness', { cookie: await signIn() });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ generatedAt: null, lateCount: 0, pages: [] });
  });

  it('answers 404 to a POST, a PUT and a DELETE and leaves the state as written', async () => {
    await seedMemoryInDatabase();
    const { app } = buildTestContext();
    const cookie = await signIn();
    const before = await (await requestJson(app, '/api/freshness', { cookie })).text();
    for (const method of ['POST', 'PUT', 'DELETE'] as const) {
      const response = await requestJson(app, '/api/freshness', {
        method,
        cookie,
        body: { generatedAt: null, lateCount: 0, pages: [] },
      });
      expect(response.status).toBe(404);
    }
    const after = await (await requestJson(app, '/api/freshness', { cookie })).text();
    expect(after).toBe(before);
    expect(after).toContain('second-brain/projets/serre');
  });

  it('refuses a request without a session', async () => {
    const { app } = buildTestContext();
    expect((await requestJson(app, '/api/freshness')).status).toBe(401);
  });
});
