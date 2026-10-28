import { beforeEach, describe, expect, it } from 'vitest';
import { buildTestContext, requestJson, signIn } from '../../../test/app-utils';
import { truncateAllTables } from '../../../test/database-utils';
import { seedMemoryInDatabase } from '../../../test/memory-fixture';

beforeEach(async () => {
  await truncateAllTables();
});

// @FollowsBlueprint test-back-e2e
describe('the history routes', () => {
  it('answers 404 for a missing day and a missing week', async () => {
    const { app } = buildTestContext();
    const cookie = await signIn();
    for (const path of [
      '/api/history/briefs/2026-10-04',
      '/api/history/briefs/2026-01-01',
      '/api/history/reviews/2026-S01',
    ]) {
      expect((await requestJson(app, path, { cookie })).status).toBe(404);
    }
    expect((await requestJson(app, '/api/history/briefs/hier', { cookie })).status).toBe(400);
  });

  it('refuses a request without a session', async () => {
    const { app } = buildTestContext();
    expect((await requestJson(app, '/api/history')).status).toBe(401);
  });

  it('lists and reads the stored briefs and weekly reviews', async () => {
    await seedMemoryInDatabase();
    const { app } = buildTestContext();
    const cookie = await signIn();
    expect(await (await requestJson(app, '/api/history', { cookie })).json()).toEqual({
      briefs: [{ date: '2026-10-05' }],
      reviews: [{ week: '2026-S40', title: 'Revue hebdo 2026-S40' }],
    });
    expect(
      await (await requestJson(app, '/api/history/briefs/2026-10-05', { cookie })).json(),
    ).toEqual({ date: '2026-10-05', markdown: 'Journée Acme.' });
    const review: { markdown: string } = await (
      await requestJson(app, '/api/history/reviews/2026-S40', { cookie })
    ).json();
    expect(review.markdown).toContain('Semaine calme.');
    const missing = await requestJson(app, '/api/history/briefs/2026-10-01', { cookie });
    expect(missing.status).toBe(404);
  });
});
