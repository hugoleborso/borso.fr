import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { buildAccountsRouter } from './accounts/accounts.controller';
import { readSiteOrigin } from './accounts/accounts.environment';
import { buildConfigRouter } from './config/config.controller';
import { buildGamesRouter } from './games/games.controller';
import { selectErrorResponse } from './helpers/errors/error-response.core';
import { selectAllowedOrigin } from './helpers/http/allowed-origin.core';
import { reportUnexpectedFailure } from './helpers/observability/error-reporting.adapter';
import { traceRequests } from './helpers/observability/request-tracing.middleware';
import { recordWideEvents } from './helpers/observability/wide-event.middleware';

// @FollowsBlueprint api-composition-root-with-one-error-translation
function buildAppRouter() {
  return new Hono()
    .use('*', traceRequests)
    .use('*', recordWideEvents)
    .use(
      '*',
      cors({
        origin: (requestOrigin) => selectAllowedOrigin(requestOrigin, readSiteOrigin()),
        credentials: true,
      }),
    )
    .onError((failure, context) => {
      reportUnexpectedFailure(failure);
      const answer = selectErrorResponse(failure);
      return context.json(answer.body, answer.status);
    })
    .get('/api/health', (context) => context.json({ ok: true }))
    .route('/api/config', buildConfigRouter())
    .route('/api/accounts', buildAccountsRouter())
    .route('/api/games', buildGamesRouter());
}

export type AppRouter = ReturnType<typeof buildAppRouter>;

export function createApp(): Hono {
  return buildAppRouter();
}
