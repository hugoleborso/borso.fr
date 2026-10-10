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
