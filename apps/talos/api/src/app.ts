import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { type BuildAuthRouterOptions, buildAuthRouter } from './auth/auth.controller';
import { buildCommitmentsRouter } from './commitments/commitments.controller';
import { buildFocusRouter } from './focus/focus.controller';
import { buildGraphRouter } from './graph/graph.controller';
import { selectErrorResponse } from './helpers/errors/error-response.core';
import { buildMessagesRouter } from './messages/messages.controller';
import { buildNotifyRouter } from './notify/notify.controller';
import { buildPagesRouter } from './pages/pages.controller';
import { buildProposalsRouter } from './proposals/proposals.controller';
import { buildPushRouter } from './push/push.controller';
import { buildSearchRouter } from './search/search.controller';
import { buildTodayRouter } from './today/today.controller';
import { buildTodosRouter } from './todos/todos.controller';

export interface CreateAppOptions {
  readonly auth?: BuildAuthRouterOptions;
}

// @FollowsBlueprint api-composition-root-with-one-error-translation
function buildAppRouter(options: CreateAppOptions = {}) {
  const { sessionRouter, ceremonyRouter, passkeysRouter } = buildAuthRouter(options.auth);
  return new Hono()
    .use('*', logger())
    .onError((failure, context) => {
      const answer = selectErrorResponse(failure);
      return context.json(answer.body, answer.status);
    })
    .get('/api/health', (context) => context.json({ ok: true }))
    .route('/api/session', sessionRouter)
    .route('/api/auth', ceremonyRouter)
    .route('/api/auth/passkeys', passkeysRouter)
    .route('/api/today', buildTodayRouter())
    .route('/api/focus', buildFocusRouter())
    .route('/api/todos', buildTodosRouter())
    .route('/api/proposals', buildProposalsRouter())
    .route('/api/commitments', buildCommitmentsRouter())
    .route('/api/graph', buildGraphRouter())
    .route('/api/pages', buildPagesRouter())
    .route('/api/search', buildSearchRouter())
    .route('/api/messages', buildMessagesRouter())
    .route('/api/push', buildPushRouter())
    .route('/api/notify', buildNotifyRouter());
}

export type AppRouter = ReturnType<typeof buildAppRouter>;

export function createApp(options: CreateAppOptions = {}): Hono {
  return buildAppRouter(options);
}
