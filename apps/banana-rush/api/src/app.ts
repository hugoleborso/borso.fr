import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { buildConfigRouter } from './config/config.controller';
import { buildGamesRouter } from './games/games.controller';
import { selectErrorResponse } from './helpers/errors/error-response.core';

/**
 * @Blueprint api-composition-root-with-one-error-translation
 * @BlueprintName Api Composition Root With One Error Translation
 * @BlueprintUsage Use for the single module that mounts every slice router and turns the application's named refusals into statuses.
 * @BlueprintDescription Chains every `.route()` call in one unbroken expression, because assigning the app to a variable and calling `.route` on it separately drops the accumulated route types that `hc<AppRouter>` reads on the front end. The error handler delegates the whole decision to a pure function, so this file branches nowhere and the failure contract is covered by ordinary unit tests. Every refusal reaches the client as a code from a closed union rather than a sentence, so the translation happens in the interface catalogue and the API never carries a language.
 */
function buildAppRouter() {
  return new Hono()
    .use('*', logger())
    .use('*', cors())
    .onError((failure, context) => {
      const answer = selectErrorResponse(failure);
      return context.json(answer.body, answer.status);
    })
    .get('/api/health', (context) => context.json({ ok: true }))
    .route('/api/config', buildConfigRouter())
    .route('/api/games', buildGamesRouter());
}

export type AppRouter = ReturnType<typeof buildAppRouter>;

export function createApp(): Hono {
  return buildAppRouter();
}
