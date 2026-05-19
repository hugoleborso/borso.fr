/**
 * Hono application factory. Lambda entry point (`main.ts`) wraps it via
 * `hono/aws-lambda`; the local dev server (`main.dev.ts`) wraps it via
 * `@hono/node-server`.
 *
 * Route layout:
 *  - `GET  /api/health`              — liveness probe.
 *  - `POST /api/auth/login`          — shared-password verification.
 *  - `POST /api/admin/set-password`  — first-deploy bootstrap (no auth).
 *  - `POST /api/admin/rotate-password` — gated by session cookie.
 *
 * Domain endpoints (catalog, sessions, setlist, bars, members,
 * instruments) land in follow-up PRs.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { type BuildAuthRouterOptions, buildAuthRouter } from './auth/auth.controller';

export interface CreateAppOptions {
  readonly auth?: BuildAuthRouterOptions;
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

  return app;
}
