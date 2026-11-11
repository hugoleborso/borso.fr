import type { MiddlewareHandler } from 'hono';
import { matchedRoutes } from 'hono/route';
import { findActiveTraceId } from './error-reporting.adapter';
import { selectRouteName } from './error-reporting.core';
import { addWideEventFields, runInWideEvent } from './wide-event.adapter';
import { buildHttpEndingFields, selectLambdaRequestId } from './wide-event.core';

const HTTP_KIND = 'http';

/**
 * @Blueprint middleware-wide-event
 * @BlueprintName Middleware Wide Event
 * @BlueprintUsage Use for the middleware an API mounts once on `*`, right after its tracing middleware, so every request writes one wide event.
 * @BlueprintDescription Typed as `MiddlewareHandler`, never refuses and always awaits `next` inside `runInWideEvent`, so the handlers and services below add fields with `addWideEventFields` and never receive the Hono context. The opening fields are the ones known before routing: the kind, a fresh request id, the method, the Lambda request id and the trace id. The route, status, duration and the error behind a 500 are added after `next` returns, and the scope writes the event once when it closes.
 */
export const recordWideEvents: MiddlewareHandler = async (context, next) => {
  const environment: unknown = context.env;
  await runInWideEvent(
    {
      'event.kind': HTTP_KIND,
      'request.id': crypto.randomUUID(),
      'http.request.method': context.req.method,
      'lambda.request_id': selectLambdaRequestId(environment),
      'trace.id': findActiveTraceId() ?? undefined,
    },
    async () => {
      const startedAt = performance.now();
      await next();
      addWideEventFields(
        buildHttpEndingFields({
          route: selectRouteName(matchedRoutes(context)),
          status: context.res.status,
          durationMilliseconds: Math.round(performance.now() - startedAt),
          failure: context.error,
        }),
      );
    },
  );
};
