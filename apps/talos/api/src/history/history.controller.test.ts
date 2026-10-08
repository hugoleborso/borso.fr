import { beforeEach, describe, expect, it } from 'vitest';
import { buildTestContext, requestJson, signIn } from '../../../test/app-utils';
import { CONTENT_FIXTURE } from '../../../test/content-fixture';
import { truncateAllTables } from '../../../test/database-utils';

beforeEach(async () => {
  await truncateAllTables();
});

// @FollowsBlueprint test-back-e2e
describe('the history routes', () => {
  it('lists the past briefs and the weekly reviews, newest first', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, '/api/history', { cookie: await signIn() });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      briefs: [{ date: '2026-10-05' }],
      reviews: [
        { week: '2026-S40', title: 'Revue hebdo 2026-S40 (28 septembre – 4 octobre 2026)' },
      ],
    });
  });

  it('reads one brief and one review', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const cookie = await signIn();
    const brief = await requestJson(app, '/api/history/briefs/2026-10-05', { cookie });
    expect(await brief.json()).toEqual({ date: '2026-10-05', markdown: '**Lundi 5 octobre**' });
    const review = await requestJson(app, '/api/history/reviews/2026-S40', { cookie });
    expect(await review.json()).toEqual({
      week: '2026-S40',
      title: 'Revue hebdo 2026-S40 (28 septembre – 4 octobre 2026)',
      markdown: CONTENT_FIXTURE['journal/2026-S40-hebdo.md'],
    });
  });

  it('answers 404 for a day without a brief, a missing day and a missing week', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
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
    const { app } = buildTestContext(CONTENT_FIXTURE);
    expect((await requestJson(app, '/api/history')).status).toBe(401);
  });
});
