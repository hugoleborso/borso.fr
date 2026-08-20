import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { buildTestSeedRouter } from './__test/test-seed.controller';
import { type BuildAuthRouterOptions, buildAuthRouter } from './auth/auth.controller';
import { buildBarsRouter } from './bars/bars.controller';
import { buildInstrumentsRouter } from './instruments/instruments.controller';
import { buildMasteryRouter } from './mastery/mastery.controller';
import { buildMembersRouter } from './members/members.controller';
import { buildOfflineManifestRouter, buildSessionsRouter } from './sessions/sessions.controller';
import { buildSetlistsRouter } from './setlists/setlists.controller';
import { buildSongsRouter } from './songs/songs.controller';
import { buildTransitionCommentsRouter } from './transitions/transitions.controller';
import { buildUploadsRouter } from './uploads/uploads.controller';

export interface CreateAppOptions {
  readonly auth?: BuildAuthRouterOptions;
}

/**
 * @Blueprint api-composition-root
 * @BlueprintName Api Composition Root
 * @BlueprintUsage Use for the single module that mounts every slice router and whose inferred type is the front end's contract.
 * @BlueprintDescription Chains every `.route()` call in one unbroken expression, because assigning the app to a variable and calling `.route` on it separately drops the accumulated route types that `hc<AppRouter>` reads on the front end. Each slice applies its own gate inside its own chain, and `createApp` mounts the test-seed router outside this expression so it never enters the exported type.
 */
function buildAppRouter(options: CreateAppOptions = {}) {
  const { publicRouter, bootstrapRouter, rotateRouter } = buildAuthRouter(options.auth ?? {});
  return new Hono()
    .use('*', logger())
    .use('*', cors())
    .get('/api/health', (context) => context.json({ ok: true }))
    .route('/api/auth', publicRouter)
    .route('/api/admin', bootstrapRouter)
    .route('/api/admin', rotateRouter)
    .route('/api/instruments', buildInstrumentsRouter())
    .route('/api/members', buildMembersRouter())
    .route('/api/songs', buildSongsRouter())
    .route('/api/mastery', buildMasteryRouter())
    .route('/api/sessions', buildSessionsRouter())
    .route('/api/offline-manifest', buildOfflineManifestRouter())
    .route('/api/setlists', buildSetlistsRouter())
    .route('/api/transition-comments', buildTransitionCommentsRouter())
    .route('/api/bars', buildBarsRouter())
    .route('/api/uploads', buildUploadsRouter());
}

export type AppRouter = ReturnType<typeof buildAppRouter>;

const TEST_SEED_FLAG = 'ALLOW_TEST_SEED';
const TEST_SEED_FLAG_ON = '1';

export function createApp(options: CreateAppOptions = {}): Hono {
  const app = buildAppRouter(options);
  const isTestSeedEnabled = process.env[TEST_SEED_FLAG] === TEST_SEED_FLAG_ON;
  if (isTestSeedEnabled) {
    app.route('/api/__test', buildTestSeedRouter());
  }
  return app;
}
