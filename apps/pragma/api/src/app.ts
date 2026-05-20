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
 *  - `*    /api/uploads`              — chord chart variants + avatar URL
 *                                       endpoints (S3 stubs), gated.
 *
 * Every gated router mounts `requireSharedPasswordSession` on its first
 * line, so no domain endpoint is callable without a valid session cookie.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { type BuildAuthRouterOptions, buildAuthRouter } from './auth/auth.controller';
import { requireSharedPasswordSession } from './auth/shared-password.middleware';
import { buildBarsRouter } from './bars/bars.controller';
import { buildInstrumentsRouter } from './instruments/instruments.controller';
import { buildMasteryRouter } from './mastery/mastery.controller';
import { buildMembersRouter } from './members/members.controller';
import { buildOfflineManifestRouter, buildSessionsRouter } from './sessions/sessions.controller';
import { buildSetlistsRouter } from './setlists/setlists.controller';
import { buildSongsRouter } from './songs/songs.controller';
import { buildTransitionCommentsRouter } from './transitions/transition-comments.controller';
import { buildUploadsRouter } from './uploads/uploads.controller';

export interface CreateAppOptions {
  readonly auth?: BuildAuthRouterOptions;
}

function mountGated(parent: Hono, path: string, child: Hono): void {
  const gated = new Hono();
  gated.use('*', requireSharedPasswordSession);
  gated.route('/', child);
  parent.route(path, gated);
}

export function createApp(options: CreateAppOptions = {}): Hono {
  const app = new Hono();
  app.use('*', logger());
  app.use('*', cors());

  app.get('/api/health', (context) => context.json({ ok: true }));

  const { publicRouter, bootstrapRouter, rotateRouter } = buildAuthRouter(
    options.auth ?? {},
  );
  app.route('/api/auth', publicRouter);

  // Two distinct routers share the `/api/admin` prefix on purpose:
  // - `bootstrapRouter` (set-password) MUST stay ungated — it is the
  //   first-deploy seed and is protected by the row-absent guard.
  // - `rotateRouter` (rotate-password) carries the session middleware
  //   on the router itself, so an authenticated cookie is required.
  // Mounting them as one router was the original bug (validation
  // 2026-05-19-2111, row A09): a single ungated mount made the rotate
  // endpoint publicly callable, allowing anyone to lock the band out.
  app.route('/api/admin', bootstrapRouter);
  app.route('/api/admin', rotateRouter);

  mountGated(app, '/api/instruments', buildInstrumentsRouter());
  mountGated(app, '/api/members', buildMembersRouter());
  mountGated(app, '/api/songs', buildSongsRouter());
  mountGated(app, '/api/mastery', buildMasteryRouter());
  mountGated(app, '/api/sessions', buildSessionsRouter());
  mountGated(app, '/api/offline-manifest', buildOfflineManifestRouter());
  mountGated(app, '/api/setlists', buildSetlistsRouter());
  mountGated(app, '/api/transition-comments', buildTransitionCommentsRouter());
  mountGated(app, '/api/bars', buildBarsRouter());
  mountGated(app, '/api/uploads', buildUploadsRouter());

  return app;
}
