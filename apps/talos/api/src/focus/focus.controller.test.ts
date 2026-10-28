import { beforeEach, describe, expect, it } from 'vitest';
import { buildTestContext, requestJson, signIn } from '../../../test/app-utils';
import { truncateAllTables } from '../../../test/database-utils';
import { readMemoryEvents, seedMemoryInDatabase } from '../../../test/memory-fixture';

beforeEach(async () => {
  await truncateAllTables();
  await seedMemoryInDatabase();
});

// @FollowsBlueprint test-back-e2e
describe('the focus routes', () => {
  it('reads and replaces the stored focus', async () => {
    const { app } = buildTestContext();
    const cookie = await signIn();
    expect(await (await requestJson(app, '/api/focus', { cookie })).json()).toEqual({
      updatedOn: '2026-10-04',
      items: [{ title: 'Atelier Acme', why: 'la date approche', horizon: '2026-10-09' }],
    });
    const replaced = await requestJson(app, '/api/focus', {
      method: 'PUT',
      body: { items: [{ title: 'Rappeler Alice Martin' }, { title: 'Devis Acme' }] },
      cookie,
    });
    const focus: { items: { title: string }[] } = await replaced.json();
    expect(focus.items).toEqual([{ title: 'Rappeler Alice Martin' }, { title: 'Devis Acme' }]);
    const events = await readMemoryEvents();
    expect(events.filter((event) => event.actor === 'pwa').map((event) => event.operation)).toEqual(
      ['focus.replace'],
    );
  });

  it('refuses a fourth item with a French message', async () => {
    const { app } = buildTestContext();
    const acme = { title: 'Acme' };
    const response = await requestJson(app, '/api/focus', {
      method: 'PUT',
      body: { items: [acme, acme, acme, acme] },
      cookie: await signIn(),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Requête invalide.' });
  });
});
