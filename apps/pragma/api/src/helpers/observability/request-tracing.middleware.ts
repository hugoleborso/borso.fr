import type { MiddlewareHandler } from 'hono';
import { matchedRoutes } from 'hono/route';
import {
  type AnsweredRequest,
  type IncomingRequest,
  traceIncomingRequest,
} from './error-reporting.adapter';
import { selectRouteName } from './error-reporting.core';

const SENTRY_TRACE_HEADER = 'sentry-trace';
const BAGGAGE_HEADER = 'baggage';

type TraceRequest = (
  request: IncomingRequest,
  answer: () => Promise<AnsweredRequest>,
) => Promise<void>;

/**
 * @Blueprint middleware-request-tracing
 * @BlueprintName Middleware Request Tracing
 * @BlueprintUsage Use for the middleware an API mounts first on `*`, so every request runs inside one Sentry `http.server` span and the wide-event middleware after it can read the trace id.
 * @BlueprintDescription `buildRequestTracing` takes the tracing function as a parameter, so its test drives a stub and never the SDK. The middleware reads `sentry-trace` and `baggage`, awaits `next` inside the trace, and returns the matched route and status, which the adapter uses to name the span and set its status. The adapter answers without a span when Sentry is off.
 */
export function buildRequestTracing(traceRequest: TraceRequest): MiddlewareHandler {
  return async (context, next) => {
    await traceRequest(
      {
        method: context.req.method,
        sentryTrace: context.req.header(SENTRY_TRACE_HEADER),
        baggage: context.req.header(BAGGAGE_HEADER),
      },
      async () => {
        await next();
        return { route: selectRouteName(matchedRoutes(context)), status: context.res.status };
      },
    );
  };
}

export const traceRequests = buildRequestTracing(traceIncomingRequest);
