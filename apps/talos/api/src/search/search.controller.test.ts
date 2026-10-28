import { beforeEach, describe, expect, it } from 'vitest';
import { buildTestContext, requestJson, signIn } from '../../../test/app-utils';
import { truncateAllTables } from '../../../test/database-utils';
import { seedMemoryInDatabase } from '../../../test/memory-fixture';

beforeEach(async () => {
  await truncateAllTables();
});

// @FollowsBlueprint test-back-e2e
describe('GET /api/search', () => {
  beforeEach(async () => {
    await seedMemoryInDatabase();
  });

  it('searches the memory, accents folded, and answers nothing for a blank query', async () => {
    const { app } = buildTestContext();
    const cookie = await signIn();
    const hits: { path: string; title: string }[] = await (
      await requestJson(app, '/api/search?q=alice', { cookie })
    ).json();
    expect(hits[0]).toMatchObject({
      path: 'second-brain/personnes/alice-martin',
      title: 'Alice Martin',
    });
    expect(await (await requestJson(app, '/api/search?q=%20', { cookie })).json()).toEqual([]);
  });
});
