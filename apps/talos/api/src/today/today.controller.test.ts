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
describe('GET /api/today', () => {
  it('answers a null brief and empty lists on an empty memory', async () => {
    const { app } = buildTestContext();
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
      soonBirthdays: [],
      reconnectCount: 0,
      readyDraftCount: 0,
    });
  });

  it('builds the dashboard from the memory tables', async () => {
    await seedMemoryInDatabase();
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/today', { cookie: await signIn() });
    const today: {
      focus: { items: { title: string }[] };
      brief: unknown;
      todos: { id: string }[];
      commitments: unknown[];
      commitmentCounts: unknown;
      activity: unknown[];
      lastRuns: unknown;
      pendingProposalCount: number;
      reconnectCount: number;
      readyDraftCount: number;
    } = await response.json();
    expect(today.focus.items.map((item) => item.title)).toEqual(['Atelier Acme']);
    expect(today.brief).toEqual({ date: '2026-10-05', markdown: 'Journée Acme.' });
    expect(today.todos.map((todo) => todo.id)).toEqual([
      'a1b2c3d4e5',
      '0f3c2a1b-4d5e-4f60-8a7b-9c0d1e2f3a4b',
    ]);
    expect(today.commitments).toEqual([]);
    expect(today.commitmentCounts).toEqual({ owed: 1, awaited: 0 });
    expect(today.activity).toEqual([{ date: '2026-10-05', heading: 'Scan de nuit' }]);
    expect(today.lastRuns).toEqual({
      scan: { at: '2026-10-05T03:24:10+02:00', trigger: 'nuit', failedSources: ['Strava'] },
      macCollection: null,
    });
    expect(today.pendingProposalCount).toBe(1);
    expect(today.reconnectCount).toBe(1);
    expect(today.readyDraftCount).toBe(1);
  });
});
