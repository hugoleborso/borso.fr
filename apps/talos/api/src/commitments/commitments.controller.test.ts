import { beforeEach, describe, expect, it } from 'vitest';
import { buildTestContext, requestJson, signIn } from '../../../test/app-utils';
import { CONTENT_FIXTURE } from '../../../test/content-fixture';
import { truncateAllTables } from '../../../test/database-utils';

beforeEach(async () => {
  await truncateAllTables();
});

// @FollowsBlueprint test-back-e2e
describe('GET /api/commitments', () => {
  it('lists the open commitments, the soonest due first', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, '/api/commitments', { cookie: await signIn() });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [
        {
          path: 'engagements/2026-10-06-devis-acme',
          title: 'Envoyer le devis à Acme',
          direction: 'owed',
          counterpart: 'second-brain/moi',
          dueDate: '2026-10-06',
        },
        {
          path: 'engagements/sans-date-retour-bruno',
          title: 'Bruno renvoie le contrat',
          direction: 'awaited',
          action: 'Bruno renvoie le contrat',
        },
      ],
    });
  });

  it('refuses a request without a session', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, '/api/commitments');
    expect(response.status).toBe(401);
  });
});
