/**
 * @DependsOnExternal sentry
 */

import { type ErrorReportingSettings, withoutPrivateContent } from '@domain/error-reporting.core';
import * as Sentry from '@sentry/aws-serverless';

const FLUSH_TIMEOUT_MILLISECONDS = 2_000;

const NO_BREADCRUMBS = 0;

const NO_SOURCE_CONTEXT_LINES = 0;

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
  queues: false,
  graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false },
  frameContextLines: NO_SOURCE_CONTEXT_LINES,
};

const SHARED_PROJECT_APP_TAGS = { app: 'talos' } as const;

// @FollowsBlueprint adapter-external-service
export function startErrorReporting(settings: ErrorReportingSettings | undefined): void {
  if (settings === undefined) return;
  Sentry.init({
    dsn: settings.dsn,
    environment: settings.environment,
    initialScope: { tags: SHARED_PROJECT_APP_TAGS },
    dataCollection: PRIVATE_DATA_COLLECTION,
    maxBreadcrumbs: NO_BREADCRUMBS,
    tracePropagationTargets: OUTGOING_TRACE_PROPAGATION_TARGETS,
    beforeSend: withoutPrivateContent,
  });
}

export async function reportUnhandledError(error: unknown): Promise<void> {
  Sentry.captureException(error);
  await Sentry.flush(FLUSH_TIMEOUT_MILLISECONDS);
}
