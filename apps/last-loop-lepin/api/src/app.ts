/**
 * Hono application — single source of truth for routing. The Lambda
 * handler (`main.ts`) wraps it via `hono/aws-lambda`; the local dev
 * server (`main.dev.ts`) wraps it via `@hono/node-server`.
 *
 * The test-seed router under `__test/` is mounted ONLY when
 * `LASTLOOP_ALLOW_TEST_SEED === '1'` — CDK sets that flag on preview
 * stacks and asserts its absence on prod (see `cdk/lib/stack.test.ts`).
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { testSeedRouter } from './__test/test-seed.controller';
import { authRouter } from './auth/auth.controller';
import { editionRouter, adminEditionRouter } from './edition/edition.controller';
import { mediaRouter } from './media/media.controller';
import { adminPunchRouter } from './punch/punch.controller';
import { selfPunchRouter } from './punch/self-punch.controller';
import { rankingRouter } from './ranking/ranking.controller';
import { runnerRouter, adminRunnerRouter } from './runner/runner.controller';

const TEST_SEED_FLAG = 'LASTLOOP_ALLOW_TEST_SEED';

export function createApp(): Hono {
  const app = new Hono();
  app.use('*', logger());
  app.use('*', cors());

  app.get('/api/health', (context) => context.json({ ok: true }));

  app.route('/api/editions', editionRouter);
  app.route('/api', runnerRouter);
  app.route('/api', rankingRouter);
  app.route('/api', selfPunchRouter);

  app.route('/api/admin/auth', authRouter);
  app.route('/api/admin/editions', adminEditionRouter);
  app.route('/api/admin/runners', adminRunnerRouter);
  app.route('/api/admin', adminPunchRouter);
  app.route('/api/admin/media', mediaRouter);

  if (process.env[TEST_SEED_FLAG] === '1') {
    app.route('/api/__test', testSeedRouter);
  }

  return app;
}
