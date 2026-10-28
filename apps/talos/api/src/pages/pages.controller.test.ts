import { beforeEach, describe, expect, it } from 'vitest';
import { buildTestContext, requestJson, signIn } from '../../../test/app-utils';
import { truncateAllTables } from '../../../test/database-utils';
import { seedMemoryInDatabase } from '../../../test/memory-fixture';

beforeEach(async () => {
  await truncateAllTables();
});

// @FollowsBlueprint test-back-e2e
describe('GET /api/pages/*', () => {
  beforeEach(async () => {
    await seedMemoryInDatabase();
  });

  it('renders a stored entity with its outgoing and incoming links', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/pages/second-brain/personnes/alice-martin', {
      cookie: await signIn(),
    });
    expect(await response.json()).toMatchObject({
      path: 'second-brain/personnes/alice-martin',
      title: 'Alice Martin',
      type: 'personne',
      outgoingLinks: ['second-brain/organisations/acme'],
      incomingLinks: ['second-brain/hugo'],
    });
  });

  it('renders any slug of the memory, a proposal included', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/pages/etat/propositions/2026-10-04-atelier', {
      cookie: await signIn(),
    });
    expect(await response.json()).toMatchObject({ type: 'proposition' });
  });

  it('answers 404 for a slug the memory does not hold', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/pages/second-brain/inconnu', {
      cookie: await signIn(),
    });
    expect(response.status).toBe(404);
  });
});
