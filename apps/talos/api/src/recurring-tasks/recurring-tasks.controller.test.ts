import { beforeEach, describe, expect, it } from 'vitest';
import { buildTestContext, requestJson, signIn } from '../../../test/app-utils';
import { truncateAllTables } from '../../../test/database-utils';
import { seedMemoryInDatabase } from '../../../test/memory-fixture';

beforeEach(async () => {
  await truncateAllTables();
});

// @FollowsBlueprint test-back-e2e
describe('GET /api/recurring-tasks', () => {
  it('reads the stored recurring state', async () => {
    await seedMemoryInDatabase();
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/recurring-tasks', { cookie: await signIn() });
    expect(response.status).toBe(200);
    const recurring: { generatedAt: string; tasks: Record<string, unknown>[] } =
      await response.json();
    expect(recurring.generatedAt).toBe('2026-11-11T18:06:25+01:00');
    expect(recurring.tasks).toHaveLength(13);
    expect(recurring.tasks[0]).toEqual({
      id: 'veille-meteo',
      title: 'Veille météo',
      cadence: 'hebdomadaire',
      routine: 'nuit',
      what: 'Relever les prévisions de la semaine et signaler un épisode de gel.',
      lastRunOn: '2026-11-05',
      nextRunOn: '2026-11-12',
      isDue: false,
    });
    expect(recurring.tasks.filter((task) => task.isDue === true)).toHaveLength(2);
    expect(recurring.tasks.filter((task) => task.lastRunOn === null)).toHaveLength(1);
  });

  it('answers an empty list when the state is missing', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/recurring-tasks', { cookie: await signIn() });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ generatedAt: null, tasks: [] });
  });

  it('refuses a request without a session', async () => {
    const { app } = buildTestContext();
    expect((await requestJson(app, '/api/recurring-tasks')).status).toBe(401);
  });
});
