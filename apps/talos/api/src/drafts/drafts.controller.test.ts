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
describe('the draft routes', () => {
  beforeEach(async () => {
    await seedMemoryInDatabase();
  });

  it('lists the stored drafts and changes their status in the memory', async () => {
    const { app } = buildTestContext();
    const cookie = await signIn();
    const listed: { items: unknown[] } = await (
      await requestJson(app, '/api/drafts', { cookie })
    ).json();
    expect(listed.items).toEqual([
      {
        slug: '2026-10-04-cafe',
        channel: 'gmail',
        recipients: [{ name: 'Alice Martin', page: 'second-brain/personnes/alice-martin' }],
        subject: 'Un café ?',
        status: 'pret',
        createdOn: '2026-10-04',
        body: 'Bonjour Alice, un café la semaine prochaine ?',
      },
    ]);
    const sent = await requestJson(app, '/api/drafts/2026-10-04-cafe', {
      method: 'PATCH',
      body: { status: 'envoye' },
      cookie,
    });
    expect(await sent.json()).toMatchObject({ status: 'envoye', sentOn: '2026-10-05' });
    const conflict = await requestJson(app, '/api/drafts/2026-10-04-cafe', {
      method: 'PATCH',
      body: { status: 'abandonne' },
      cookie,
    });
    expect(conflict.status).toBe(409);
    const undone = await requestJson(app, '/api/drafts/2026-10-04-cafe', {
      method: 'PATCH',
      body: { status: 'pret' },
      cookie,
    });
    const ready: { status: string; sentOn?: string } = await undone.json();
    expect(ready.status).toBe('pret');
    expect(ready.sentOn).toBeUndefined();
  });

  it('answers 404 for a draft the memory does not hold', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/drafts/inconnu', {
      method: 'PATCH',
      body: { status: 'envoye' },
      cookie: await signIn(),
    });
    expect(response.status).toBe(404);
  });

  it('refuses a status that is not one', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/drafts/2026-10-04-cafe', {
      method: 'PATCH',
      body: { status: 'publie' },
      cookie: await signIn(),
    });
    expect(response.status).toBe(400);
  });

  it('refuses a request without a session', async () => {
    const { app } = buildTestContext();
    expect((await requestJson(app, '/api/drafts')).status).toBe(401);
  });
});
