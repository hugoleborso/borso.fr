/**
 * Hono application factory. Lambda entry point (`main.ts`) wraps it via
 * `hono/aws-lambda`; the local dev server (`main.dev.ts`) wraps it via
 * `@hono/node-server`.
 *
 * Route layout:
 *  - `GET  /api/health`               — liveness probe (public).
 *  - `POST /api/auth/login`           — shared-password verification.
 *  - `POST /api/admin/set-password`   — first-deploy bootstrap (no auth).
 *  - `POST /api/admin/rotate-password`— gated by session cookie.
 *  - `*    /api/instruments`          — instruments CRUD, gated.
 *  - `*    /api/members`              — members CRUD + member-instrument
 *                                       assignment, gated.
 *  - `*    /api/songs`                — catalog CRUD, gated.
 *  - `*    /api/mastery`              — default + override matrix, gated.
 *  - `*    /api/sessions`             — practices + concerts CRUD, gated.
 *  - `*    /api/setlists`             — setlist entries + reorder, gated.
 *  - `*    /api/transition-comments`  — comments on ordered song pairs, gated.
 *  - `*    /api/bars`                 — CRM CRUD + stage transitions, gated.
 *  - `*    /api/uploads`              — chord chart presigned PUT + GET
 *                                       URLs, backed by S3, gated.
 *
 * Every gated controller starts its chain with
 * `.use('*', requireSharedPasswordSession)`, so no domain endpoint is
 * callable without a valid session cookie. Doing the gating inside the
 * controller chain (instead of via a `mountGated` wrapper) keeps the
 * chained Hono type — and therefore the RPC inference — intact end to
 * end. `AppRouter` (the inferred return type of `buildAppRouter`) is
 * what the FE consumes via `hc<AppRouter>(baseUrl)`.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { testSeedRouter } from './__test/test-seed.controller';
import { type BuildAuthRouterOptions, buildAuthRouter } from './auth/auth.controller';
import { buildBarsRouter } from './bars/bars.controller';
import { buildInstrumentsRouter } from './instruments/instruments.controller';
import { buildMasteryRouter } from './mastery/mastery.controller';
import { buildMembersRouter } from './members/members.controller';
import { buildOfflineManifestRouter, buildSessionsRouter } from './sessions/sessions.controller';
import { buildSetlistsRouter } from './setlists/setlists.controller';
import { buildSongsRouter } from './songs/songs.controller';
import { buildTransitionCommentsRouter } from './transitions/transition-comments.controller';
import { buildUploadsRouter } from './uploads/uploads.controller';

const TEST_SEED_FLAG = 'PRAGMA_ALLOW_TEST_SEED';

export interface CreateAppOptions {
  readonly auth?: BuildAuthRouterOptions;
}

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

export function createApp(options: CreateAppOptions = {}): Hono {
  const app = buildAppRouter(options);
  if (process.env[TEST_SEED_FLAG] === '1') {
    app.route('/api/__test', testSeedRouter);
  }
  return app;
}
