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
import { requireSharedPasswordSession } from './auth/shared-password.middleware';

export interface CreateAppOptions {
  readonly auth?: BuildAuthRouterOptions;
}

export function createApp(options: CreateAppOptions = {}): Hono {
  const app = new Hono();
  app.use('*', logger());
  app.use('*', cors());

  app.get('/api/health', (context) => context.json({ ok: true }));

  const { publicRouter, adminRouter } = buildAuthRouter(options.auth ?? {});
  app.route('/api/auth', publicRouter);

  // `set-password` is intentionally NOT gated — it can only succeed
  // when the row doesn't yet exist. Mount BEFORE the session middleware.
  app.route('/api/admin', adminRouter);

  // Everything else under /api/admin is gated; mounted as no-op for now
  // because domain admin endpoints land in a follow-up PR. The session
  // middleware itself is wired here so the rotate-password path stays
  // protected.
  const gated = new Hono();
  gated.use('*', requireSharedPasswordSession);
  app.route('/api/admin/protected', gated);

  return app;
}
