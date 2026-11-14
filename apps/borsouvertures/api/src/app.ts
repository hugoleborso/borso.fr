import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { buildTestSeedRouter } from './__test/test-seed.controller';
import { type BuildAuthRouterOptions, buildAuthRouter } from './auth/auth.controller';
import {
  type BuildDeckLineEventsRouterOptions,
  buildDeckLineEventsRouter,
} from './deck-line-events/deck-line-events.controller';
import { traceRequests } from './helpers/observability/request-tracing.middleware';
import { answerUnhandledError } from './helpers/observability/unhandled-error.middleware';
import { recordWideEvents } from './helpers/observability/wide-event.middleware';
import {
  type BuildReviewEventsRouterOptions,
  buildReviewEventsRouter,
} from './review-events/review-events.controller';

export interface CreateAppOptions {
  readonly auth?: BuildAuthRouterOptions;
  readonly reviewEvents?: BuildReviewEventsRouterOptions;
  readonly deckLineEvents?: BuildDeckLineEventsRouterOptions;
}

// @FollowsBlueprint api-composition-root
function buildAppRouter(options: CreateAppOptions = {}) {
  const { publicRouter, sessionRouter } = buildAuthRouter(options.auth ?? {});
  return new Hono()
    .use('*', traceRequests)
    .use('*', recordWideEvents)
    .use('*', cors())
    .onError(answerUnhandledError)
    .get('/api/health', (context) => context.json({ ok: true }))
    .route('/api/auth', publicRouter)
    .route('/api/auth', sessionRouter)
    .route('/api/review-events', buildReviewEventsRouter(options.reviewEvents ?? {}))
    .route('/api/deck-line-events', buildDeckLineEventsRouter(options.deckLineEvents ?? {}));
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
