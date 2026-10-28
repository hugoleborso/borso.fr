import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildTestContext, requestJson, signIn } from '../../../test/app-utils';
import { truncateAllTables } from '../../../test/database-utils';
import { seedMemoryInDatabase, writeMemory } from '../../../test/memory-fixture';

beforeEach(async () => {
  await truncateAllTables();
});

function openCommitmentDueOn(slug: string, dueDay: string): unknown {
  return {
    op: 'commitment.upsert',
    slug,
    due: dueDay,
    status: 'ouvert',
    attributes: Object.fromEntries([
      ['type', 'engagement'],
      ['statut', 'ouvert'],
      ['echeance', dueDay],
    ]),
    body: '',
  };
}

afterEach(() => {
  vi.useRealTimers();
});

// @FollowsBlueprint test-back-e2e
describe('GET /api/commitments', () => {
  it('lists the open stored commitments only', async () => {
    await seedMemoryInDatabase();
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/commitments', { cookie: await signIn() });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [
        {
          path: 'engagements/2026-10-07-devis-acme',
          title: 'Envoyer le devis à Acme',
          direction: 'owed',
          counterpart: 'second-brain/personnes/alice-martin',
          action: 'Envoyer le devis',
          dueDate: '2026-10-07',
        },
      ],
    });
  });

  it('lists the week ahead before the overdue, today read in Paris', async () => {
    await writeMemory(
      [
        openCommitmentDueOn('engagements/a-yesterday', '2026-10-26'),
        openCommitmentDueOn('engagements/b-today', '2026-10-27'),
      ],
      'commitments',
    );
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-26T23:30:00Z'));
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/commitments', { cookie: await signIn() });
    const body: unknown = await response.json();
    expect(body).toMatchObject({
      items: [{ path: 'engagements/b-today' }, { path: 'engagements/a-yesterday' }],
    });
  });

  it('refuses a request without a session', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/commitments');
    expect(response.status).toBe(401);
  });
});
