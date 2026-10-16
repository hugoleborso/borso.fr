import { beforeEach, describe, expect, it } from 'vitest';
import { buildTestContext, requestJson, signIn } from '../../../test/app-utils';
import { CONTENT_FIXTURE } from '../../../test/content-fixture';
import { truncateAllTables } from '../../../test/database-utils';
import { readMemoryEvents, seedMemoryInDatabase } from '../../../test/memory-fixture';

beforeEach(async () => {
  await truncateAllTables();
});

// @FollowsBlueprint test-back-e2e
describe('the focus routes', () => {
  it('reads focus.md', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, '/api/focus', { cookie: await signIn() });
    expect(await response.json()).toEqual({
      updatedOn: '2026-10-04',
      items: [{ title: 'Acme', why: 'appel lundi', horizon: '2026-10-05' }],
    });
  });

  it('rewrites focus.md, dated today, and answers what it wrote', async () => {
    const { app, overlay } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, '/api/focus', {
      method: 'PUT',
      body: { items: [{ title: 'Séville', horizon: '2026-10-15' }] },
      cookie: await signIn(),
    });
    expect(response.status).toBe(200);
    const focus: { updatedOn: string; items: unknown[] } = await response.json();
    expect(focus.items).toEqual([{ title: 'Séville', horizon: '2026-10-15' }]);
    expect(overlay.get('focus.md')).toContain('- **Séville** | horizon: 2026-10-15');
  });

  it('refuses a fourth item with a French message', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
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

describe('the focus routes once the memory is in the database', () => {
  beforeEach(async () => {
    await seedMemoryInDatabase();
  });

  it('reads and replaces the stored focus', async () => {
    const { app, overlay } = buildTestContext(CONTENT_FIXTURE);
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
    expect(overlay.size).toBe(0);
    const events = await readMemoryEvents();
    expect(events.filter((event) => event.actor === 'pwa').map((event) => event.operation)).toEqual(
      ['focus.replace'],
    );
  });
});
