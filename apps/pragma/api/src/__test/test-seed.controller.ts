/**
 * Test-only seeding endpoint. Mounted by `app.ts` ONLY when
 * `ALLOW_TEST_SEED === '1'` — a flag `PreviewableApp` injects on every
 * non-prod API Lambda and never on prod, so this route is structurally
 * unreachable in production.
 *
 * `POST /api/__test/seed` wipes the domain tables, writes one coherent
 * fixture, and bootstraps the admin password so a freshly deployed
 * preview is loginable from the single call. The fixture itself lives
 * in `test-seed.service.ts`.
 */

import { Hono } from 'hono';
import { seedPreviewFixture } from './test-seed.service';

// @FollowsBlueprint controller-dispatch
export function buildTestSeedRouter() {
  return new Hono().post('/seed', async (context) => {
    const summary = await seedPreviewFixture(new Date());
    return context.json(summary);
  });
}
