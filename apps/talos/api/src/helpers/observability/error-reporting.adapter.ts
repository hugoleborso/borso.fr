/**
 * @DependsOnExternal sentry
 */

import { type ErrorReportingSettings, withoutPrivateContent } from '@domain/error-reporting.core';
import * as Sentry from '@sentry/aws-serverless';

const FLUSH_TIMEOUT_MILLISECONDS = 2_000;

const NO_BREADCRUMBS = 0;

const NO_SOURCE_CONTEXT_LINES = 0;

const REQUEST_SPAN_OPERATION = 'http.server';

const OUTGOING_TRACE_PROPAGATION_TARGETS: string[] = [];

const UNTRACED_INTEGRATION_NAMES: ReadonlySet<string> = new Set([
  'Postgres',
  'PostgresJs',
  'NodeFetch',
]);

type ReportingOptions = NonNullable<Parameters<typeof Sentry.init>[0]>;

interface NamedIntegration {
  readonly name: string;
}

const PRIVATE_DATA_COLLECTION: ReportingOptions['dataCollection'] = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  databaseQueryData: false,
  stackFrameVariables: false,
  queues: false,
  graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false },
  frameContextLines: NO_SOURCE_CONTEXT_LINES,
};

const SHARED_PROJECT_APP_TAGS = { app: 'talos' } as const;

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

function isUnrecordedOutgoingRequest(): boolean {
  return true;
}

export function selectTracedIntegrations<Integration extends NamedIntegration>(
  defaults: readonly Integration[],
): (Integration | ReturnType<typeof Sentry.nativeNodeFetchIntegration>)[] {
  return [
    ...defaults.filter((integration) => !UNTRACED_INTEGRATION_NAMES.has(integration.name)),
    Sentry.nativeNodeFetchIntegration({ ignoreOutgoingRequests: isUnrecordedOutgoingRequest }),
  ];
}

// @FollowsBlueprint adapter-external-service
export function startErrorReporting(settings: ErrorReportingSettings | undefined): void {
  if (settings === undefined) return;
  Sentry.init({
    dsn: settings.dsn,
    environment: settings.environment,
    ...(settings.release === undefined ? {} : { release: settings.release }),
    initialScope: { tags: SHARED_PROJECT_APP_TAGS },
    dataCollection: PRIVATE_DATA_COLLECTION,
    maxBreadcrumbs: NO_BREADCRUMBS,
    tracesSampleRate: settings.tracesSampleRate,
    tracePropagationTargets: OUTGOING_TRACE_PROPAGATION_TARGETS,
    integrations: selectTracedIntegrations,
    beforeSend: withoutPrivateContent,
  });
}

export async function reportUnhandledError(error: unknown): Promise<void> {
  Sentry.captureException(error);
  await Sentry.flush(FLUSH_TIMEOUT_MILLISECONDS);
}

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
  await Sentry.flush(FLUSH_TIMEOUT_MILLISECONDS);
}
