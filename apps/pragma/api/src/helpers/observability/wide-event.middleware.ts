import type { MiddlewareHandler } from 'hono';
import { matchedRoutes } from 'hono/route';
import { findActiveTraceId } from './error-reporting.adapter';
import { selectRouteName } from './error-reporting.core';
import { addWideEventFields, runInWideEvent } from './wide-event.adapter';
import { buildHttpEndingFields, selectLambdaRequestId } from './wide-event.core';

const HTTP_KIND = 'http';

// @FollowsBlueprint middleware-session-gate
export const recordWideEvents: MiddlewareHandler = async (context, next) => {
  const environment: unknown = context.env;
  await runInWideEvent(
    {
      'event.kind': HTTP_KIND,
      'request.id': crypto.randomUUID(),
      'http.request.method': context.req.method,
      'lambda.request_id': selectLambdaRequestId(environment),
      'trace.id': findActiveTraceId(),
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
