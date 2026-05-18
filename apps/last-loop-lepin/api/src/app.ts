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

function buildAppRouter() {
  return new Hono()
    .use('*', logger())
    .use('*', cors())
    .get('/api/health', (context) => context.json({ ok: true }))
    .route('/api/editions', editionRouter)
    .route('/api', runnerRouter)
    .route('/api', rankingRouter)
    .route('/api', selfPunchRouter)
    .route('/api/admin/auth', authRouter)
    .route('/api/admin/editions', adminEditionRouter)
    .route('/api/admin/runners', adminRunnerRouter)
    .route('/api/admin', adminPunchRouter)
    .route('/api/admin/media', mediaRouter);
}

export type AppType = ReturnType<typeof buildAppRouter>;

export function createApp(): Hono {
  const app = buildAppRouter();
  if (process.env[TEST_SEED_FLAG] === '1') {
    app.route('/api/__test', testSeedRouter);
  }
  return app;
}
