import { Hono } from 'hono';
import { seedPreviewFixture } from './test-seed.service';

// @FollowsBlueprint controller-dispatch
export function buildTestSeedRouter() {
  return new Hono().post('/seed', async (context) => {
    const summary = await seedPreviewFixture(new Date());
    return context.json(summary);
  });
}
