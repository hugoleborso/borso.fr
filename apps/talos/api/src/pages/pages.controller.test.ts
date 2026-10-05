import { beforeEach, describe, expect, it } from 'vitest';
import { buildTestContext, requestJson, signIn } from '../../../test/app-utils';
import { CONTENT_FIXTURE } from '../../../test/content-fixture';
import { truncateAllTables } from '../../../test/database-utils';

beforeEach(async () => {
  await truncateAllTables();
});

// @FollowsBlueprint test-back-e2e
describe('GET /api/pages/*', () => {
  it('answers a page with its links in both directions', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, '/api/pages/second-brain/projets/refonte', {
      cookie: await signIn(),
    });
    expect(await response.json()).toEqual({
      path: 'second-brain/projets/refonte',
      title: 'Refonte du site',
      type: 'projet',
      frontMatter: { type: 'projet' },
      markdown: '# Refonte du site\n\nPilotée par [[second-brain/moi]].\n',
      outgoingLinks: ['second-brain/moi'],
      incomingLinks: ['index', 'second-brain/moi'],
    });
  });

  it('reads a journal page', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, '/api/pages/journal/2026-10-05', {
      cookie: await signIn(),
    });
    expect(response.status).toBe(200);
  });

  it('answers 404 for a missing page', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, '/api/pages/second-brain/absente', {
      cookie: await signIn(),
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Page introuvable.' });
  });

  it('never reads outside the second brain', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const cookie = await signIn();
    expect((await requestJson(app, '/api/pages/etat/securite', { cookie })).status).toBe(404);
    expect(
      (await requestJson(app, '/api/pages/second-brain/..%2Fetat%2Fsecurite', { cookie })).status,
    ).toBe(404);
  });
});
