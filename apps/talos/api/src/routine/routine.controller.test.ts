import { beforeEach, describe, expect, it } from 'vitest';
import { buildTestContext, requestJson, signIn } from '../../../test/app-utils';
import { truncateAllTables } from '../../../test/database-utils';
import { getDatabase } from '../database/client';
import { routineRunTable } from './routine.schema';

const SESSION_URL = 'https://claude.ai/code/session_01ExempleInvente';

async function storeRuns(count: number): Promise<void> {
  const rows = Array.from({ length: count }, (_unused, minute) => ({
    id: `00000000-0000-4000-8000-${String(minute).padStart(12, '0')}`,
    firedAt: new Date(Date.UTC(2026, 10, 11, 9, minute)),
    trigger: minute % 2 === 0 ? ('proposition' as const) : ('message' as const),
    subject: `run ${String(minute)}`,
    sessionUrl: SESSION_URL,
  }));
  await getDatabase().insert(routineRunTable).values(rows);
}

beforeEach(async () => {
  await truncateAllTables();
});

// @FollowsBlueprint test-back-e2e
describe('GET /api/routine/runs', () => {
  it('answers the 20 most recent runs, newest first, the runs of the former Message screen included', async () => {
    await storeRuns(22);
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/routine/runs', { cookie: await signIn() });
    expect(response.status).toBe(200);
    const listed: { items: { subject: string; trigger: string }[] } = await response.json();
    expect(listed.items.map((run) => run.subject)).toEqual(
      Array.from({ length: 20 }, (_unused, rank) => `run ${String(21 - rank)}`),
    );
    expect(listed.items[0]).toEqual({
      id: '00000000-0000-4000-8000-000000000021',
      firedAt: '2026-11-11T09:21:00.000Z',
      trigger: 'message',
      subject: 'run 21',
      sessionUrl: SESSION_URL,
    });
  });

  it('answers an empty list while nothing was fired', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/routine/runs', { cookie: await signIn() });
    expect(await response.json()).toEqual({ items: [] });
  });

  it('refuses a caller without a session', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/routine/runs');
    expect(response.status).toBe(401);
  });
});

describe('POST /api/routine/runs', () => {
  it('no longer exists, since the PWA has no Message screen to send from', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/routine/runs', {
      method: 'POST',
      body: { text: 'Bonjour' },
      cookie: await signIn(),
    });
    expect(response.status).toBe(404);
    expect(await getDatabase().select().from(routineRunTable)).toEqual([]);
  });
});
