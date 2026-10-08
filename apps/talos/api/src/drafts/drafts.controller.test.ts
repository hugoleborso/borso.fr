import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildTestContext, requestJson, signIn } from '../../../test/app-utils';
import { CONTENT_FIXTURE } from '../../../test/content-fixture';
import { truncateAllTables } from '../../../test/database-utils';

const READY_PATH = 'etat/brouillons/2026-10-04-relance-alice.md';

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
  it('lists the drafts newest first, without the files that are not drafts', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, '/api/drafts', { cookie: await signIn() });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [
        {
          slug: '2026-10-04-relance-alice',
          channel: 'gmail',
          recipients: [{ name: 'Alice Martin', page: 'second-brain/personnes/alice-martin' }],
          subject: 'Un café ?',
          status: 'pret',
          createdOn: '2026-10-04',
          source: 'sources/2026/10/04/relance.md',
          body: 'Bonjour Alice,\n\nUn café la semaine prochaine ?',
        },
        {
          slug: '2026-10-03-merci-bruno',
          channel: 'slack',
          recipients: [{ name: 'Bruno' }],
          status: 'envoye',
          createdOn: '2026-10-03',
          sentOn: '2026-10-03',
          body: 'Merci !',
        },
      ],
    });
  });

  it('marks a draft sent, then puts it back, touching only its status and sent day', async () => {
    const { app, overlay } = buildTestContext(CONTENT_FIXTURE);
    const cookie = await signIn();
    const sent = await requestJson(app, '/api/drafts/2026-10-04-relance-alice', {
      method: 'PATCH',
      body: { status: 'envoye' },
      cookie,
    });
    expect(sent.status).toBe(200);
    expect(await sent.json()).toMatchObject({ status: 'envoye', sentOn: '2026-10-05' });
    expect(overlay.get(READY_PATH)).toBe(
      (CONTENT_FIXTURE[READY_PATH] ?? '')
        .replace('statut: pret', 'statut: envoye')
        .replace('envoye:\n', 'envoye: 2026-10-05\n'),
    );
    const reopened = await requestJson(app, '/api/drafts/2026-10-04-relance-alice', {
      method: 'PATCH',
      body: { status: 'pret' },
      cookie,
    });
    expect(await reopened.json()).toMatchObject({ status: 'pret' });
    expect(overlay.get(READY_PATH)).toBe(CONTENT_FIXTURE[READY_PATH]);
  });

  it('abandons a ready draft', async () => {
    const { app, overlay } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, '/api/drafts/2026-10-04-relance-alice', {
      method: 'PATCH',
      body: { status: 'abandonne' },
      cookie: await signIn(),
    });
    expect(await response.json()).toMatchObject({ status: 'abandonne' });
    expect(overlay.get(READY_PATH)).toMatch(/^statut: abandonne$/m);
  });

  it('refuses to settle a draft twice, an unknown draft and an invalid status', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const cookie = await signIn();
    const twice = await requestJson(app, '/api/drafts/2026-10-03-merci-bruno', {
      method: 'PATCH',
      body: { status: 'abandonne' },
      cookie,
    });
    expect(twice.status).toBe(409);
    expect(await twice.json()).toEqual({ error: 'Ce brouillon a déjà changé de statut.' });
    const unknown = await requestJson(app, '/api/drafts/inconnu', {
      method: 'PATCH',
      body: { status: 'envoye' },
      cookie,
    });
    expect(unknown.status).toBe(404);
    const invalid = await requestJson(app, '/api/drafts/2026-10-03-merci-bruno', {
      method: 'PATCH',
      body: { status: 'publie' },
      cookie,
    });
    expect(invalid.status).toBe(400);
  });

  it('refuses a request without a session', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    expect((await requestJson(app, '/api/drafts')).status).toBe(401);
  });
});
