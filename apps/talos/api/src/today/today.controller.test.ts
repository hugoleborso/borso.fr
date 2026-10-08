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
describe('GET /api/today', () => {
  it('gathers the focus, the brief, the tasks due soon and the pending proposals', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, '/api/today', { cookie: await signIn() });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      date: '2026-10-05',
      focus: { updatedOn: '2026-10-04', items: [{ title: 'Acme' }] },
      brief: { date: '2026-10-05', markdown: '**Lundi 5 octobre**' },
      todos: [{ text: 'Envoyer le CV' }, { text: 'Clore les fils' }],
      commitments: [{ path: 'engagements/2026-10-06-devis-acme', dueDate: '2026-10-06' }],
      commitmentCounts: { owed: 1, awaited: 1 },
      activity: [
        { date: '2026-10-05', heading: 'Fait' },
        { date: '2026-10-04', heading: 'Scan (18:00)' },
      ],
      lastRuns: {
        scan: { at: '2026-10-05T07:30:00+02:00', trigger: 'brief', failedSources: ['Strava'] },
        macCollection: null,
      },
      pendingProposalCount: 1,
    });
  });

  it('answers a null brief and empty lists on a quiet repository', async () => {
    const { app } = buildTestContext({});
    const response = await requestJson(app, '/api/today', { cookie: await signIn() });
    expect(await response.json()).toEqual({
      date: '2026-10-05',
      focus: { updatedOn: null, items: [] },
      brief: null,
      todos: [],
      commitments: [],
      commitmentCounts: { owed: 0, awaited: 0 },
      activity: [],
      lastRuns: null,
      pendingProposalCount: 0,
    });
  });
});
