/**
 * @DependsOnExternal sentry
 */

import * as Sentry from '@sentry/aws-serverless';
import type { ErrorReportingSettings } from './error-reporting.core';

const FLUSH_TIMEOUT_MILLISECONDS = 2_000;

const NO_TRACING = 0;

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

const SHARED_PROJECT_APP_TAGS = { app: 'last-loop-lepin' } as const;

// @FollowsBlueprint adapter-external-service
export function startErrorReporting(settings: ErrorReportingSettings | undefined): void {
  if (settings === undefined) return;
  Sentry.init({
    dsn: settings.dsn,
    environment: settings.environment,
    initialScope: { tags: SHARED_PROJECT_APP_TAGS },
    tracesSampleRate: NO_TRACING,
    tracePropagationTargets: OUTGOING_TRACE_PROPAGATION_TARGETS,
    dataCollection: PRIVATE_DATA_COLLECTION,
  });
}

export async function reportUnhandledError(error: unknown): Promise<void> {
  Sentry.captureException(error);
  await Sentry.flush(FLUSH_TIMEOUT_MILLISECONDS);
}
