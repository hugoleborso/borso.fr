/**
 * Hono application factory. The Lambda entry point (`main.ts`) wraps it with
 * `hono/aws-lambda`; the local dev server (`main.dev.ts`) wraps it with
 * `@hono/node-server`.
 *
 * Route layout:
 *  - `GET  /api/health`        liveness probe.
 *  - `*    /api/books`         the reading list, plus `/books/lookup`, which
 *                              fronts OpenLibrary through the books adapter.
 *  - `*    /api/shelves`       named groupings, whose delete detaches first.
 *
 * `AppRouter`, the inferred return type of `buildAppRouter`, is what the front
 * end consumes through `hc<AppRouter>(baseUrl)`.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { buildBooksRouter } from './books/books.controller';
import { buildShelvesRouter } from './shelves/shelves.controller';

// @FollowsBlueprint api-composition-root
function buildAppRouter() {
  return new Hono()
    .use('*', logger())
    .use('*', cors())
    .get('/api/health', (context) => context.json({ ok: true }))
    .route('/api/books', buildBooksRouter())
    .route('/api/shelves', buildShelvesRouter());
}

export type AppRouter = ReturnType<typeof buildAppRouter>;

export function createApp(): Hono {
  return buildAppRouter();
}
