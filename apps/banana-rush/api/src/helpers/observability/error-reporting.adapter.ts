/**
 * @DependsOnExternal sentry
 */

import type { ErrorReportingSettings } from '@domain/error-reporting.core';
import * as Sentry from '@sentry/aws-serverless';
import { isGameError } from '../errors/game-error.types';
import { redactDatabaseSpan } from './database-span.core';

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

const SHARED_PROJECT_APP_TAGS = { app: 'banana-rush' } as const;

export interface IncomingRequest {
  readonly method: string;
  readonly sentryTrace: string | undefined;
  readonly baggage: string | undefined;
}

export interface AnsweredRequest {
  readonly route: string;
  readonly status: number;
}

export type SpanAttributeValue = string | number | boolean | readonly string[];

// @FollowsBlueprint adapter-external-service
export function startErrorReporting(settings: ErrorReportingSettings | undefined): void {
  if (settings === undefined) return;
  Sentry.init({
    dsn: settings.dsn,
    environment: settings.environment,
    ...(settings.release === undefined ? {} : { release: settings.release }),
    initialScope: { tags: SHARED_PROJECT_APP_TAGS },
    tracesSampleRate: settings.tracesSampleRate,
    tracePropagationTargets: OUTGOING_TRACE_PROPAGATION_TARGETS,
    dataCollection: PRIVATE_DATA_COLLECTION,
    enableRuntimeChannelInjection: false,
    integrations: [Sentry.postgresJsIntegration()],
    beforeSendSpan: redactDatabaseSpan,
  });
}

export function reportUnexpectedFailure(failure: unknown): void {
  if (isGameError(failure)) return;
  Sentry.captureException(failure);
}

export const reportHandlerFailures = Sentry.wrapHandler;

export function recordAttributesOnActiveSpan(
  attributes: Readonly<Record<string, SpanAttributeValue>>,
): void {
  const span = Sentry.getActiveSpan();
  if (span === undefined) return;
  for (const [key, value] of Object.entries(attributes)) {
    span.setAttribute(key, typeof value === 'object' ? [...value] : value);
  }
}

export function findActiveTraceId(): string | null {
  return Sentry.getActiveSpan()?.spanContext().traceId ?? null;
}

async function answerInRequestSpan(
  request: IncomingRequest,
  answer: () => Promise<AnsweredRequest>,
): Promise<void> {
  await Sentry.startSpan(
    {
      name: request.method,
      op: REQUEST_SPAN_OPERATION,
      // eslint-disable-next-line typescript/no-deprecated -- the request span is a root span under continueTrace and error-reporting.adapter.test.ts asserts this option; replacing it with the root-span pattern Sentry's deprecation notice points to is a tracing change, to be reviewed as one.
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
}
