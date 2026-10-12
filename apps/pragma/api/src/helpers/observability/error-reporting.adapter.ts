/**
 * @DependsOnExternal sentry
 */

import * as Sentry from '@sentry/aws-serverless';
import type { ErrorReportingSettings } from './error-reporting.core';

const FLUSH_TIMEOUT_MILLISECONDS = 2_000;

const REQUEST_SPAN_OPERATION = 'http.server';

const OUTGOING_TRACE_PROPAGATION_TARGETS: string[] = [];

type ReportingOptions = NonNullable<Parameters<typeof Sentry.init>[0]>;

const PRIVATE_DATA_COLLECTION: ReportingOptions['dataCollection'] = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  databaseQueryData: false,
  stackFrameVariables: false,
};

export interface IncomingRequest {
  readonly method: string;
  readonly sentryTrace: string | undefined;
  readonly baggage: string | undefined;
}

export interface AnsweredRequest {
  readonly route: string;
  readonly status: number;
}

// @FollowsBlueprint adapter-external-service
export function startErrorReporting(settings: ErrorReportingSettings | undefined): void {
  if (settings === undefined) return;
  Sentry.init({
    dsn: settings.dsn,
    environment: settings.environment,
    ...(settings.release === undefined ? {} : { release: settings.release }),
    tracesSampleRate: settings.tracesSampleRate,
    tracePropagationTargets: OUTGOING_TRACE_PROPAGATION_TARGETS,
    dataCollection: PRIVATE_DATA_COLLECTION,
  });
}

export function reportUnhandledError(error: unknown): void {
  Sentry.captureException(error);
}

async function answerInRequestSpan(
  request: IncomingRequest,
  answer: () => Promise<AnsweredRequest>,
): Promise<void> {
  await Sentry.startSpan(
    {
      name: request.method,
      op: REQUEST_SPAN_OPERATION,
      forceTransaction: true,
      attributes: { 'http.request.method': request.method },
    },
    async (span) => {
      const answered = await answer();
      Sentry.updateSpanName(span, `${request.method} ${answered.route}`);
      span.setAttribute('http.route', answered.route);
      Sentry.setHttpStatus(span, answered.status);
    },
  );
}

export async function traceIncomingRequest(
  request: IncomingRequest,
  answer: () => Promise<AnsweredRequest>,
): Promise<void> {
  const isReporting = Sentry.isInitialized();
  if (!isReporting) {
    await answer();
    return;
  }
  await Sentry.withIsolationScope(() =>
    Sentry.continueTrace({ sentryTrace: request.sentryTrace, baggage: request.baggage }, () =>
      answerInRequestSpan(request, answer),
    ),
  );
  await Sentry.flush(FLUSH_TIMEOUT_MILLISECONDS);
}
