/**
 * Test-only seeding endpoint. Mounted by `app.ts` ONLY when
 * `ALLOW_TEST_SEED === '1'`. CDK never sets that flag on the prod stack
 * (asserted in `cdk/lib/stack.test.ts`).
 */

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
