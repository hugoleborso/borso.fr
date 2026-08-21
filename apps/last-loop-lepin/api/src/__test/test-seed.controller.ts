import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { applySeedFixture } from './test-seed.service';
import { seedFixtureSchema } from './test-seed.schema';

// @FollowsBlueprint controller-public-router
const testSeedRouter = new Hono().post(
  '/seed',
  zValidator('query', seedFixtureSchema),
  async (context) => {
    const { fixture } = context.req.valid('query');
    const seeded = await applySeedFixture(fixture, new Date());
    return context.json({
      fixture: seeded.fixture,
      edition: seeded.editionSlug,
      runners: seeded.runnerCount,
    });
  },
);

export { testSeedRouter };
