import { beforeEach, describe, expect, it } from 'vitest';
import { buildTestContext, requestJson, signIn } from '../../../test/app-utils';
import { CONTENT_FIXTURE } from '../../../test/content-fixture';
import { truncateAllTables } from '../../../test/database-utils';

beforeEach(async () => {
  await truncateAllTables();
});

// @FollowsBlueprint test-back-e2e
describe('GET /api/search', () => {
  it('ranks title matches first, then pages by how often they mention the words', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, '/api/search?q=refonte', { cookie: await signIn() });
    const hits: { path: string; title: string }[] = await response.json();
    expect(hits.map((hit) => hit.path)).toEqual([
      'second-brain/projets/refonte',
      'second-brain/moi',
      'index',
    ]);
  });

  it('finds a word whatever its accents', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, '/api/search?q=seville', { cookie: await signIn() });
    expect(await response.json()).toEqual([
      {
        path: 'second-brain/moi',
        title: 'Alex Durand',
        excerpt: '…Travaille sur [[second-brain/projets/refonte|la refonte]] à Séville.',
      },
    ]);
  });

  it('never searches outside the second brain', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, '/api/search?q=secrets', { cookie: await signIn() });
    expect(await response.json()).toEqual([]);
  });
});
