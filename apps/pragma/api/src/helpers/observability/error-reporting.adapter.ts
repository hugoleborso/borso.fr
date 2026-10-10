/**
 * @DependsOnExternal sentry
 */

import * as Sentry from '@sentry/aws-serverless';
import type { ErrorReportingSettings } from './error-reporting.core';

const FLUSH_TIMEOUT_MILLISECONDS = 2_000;

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

// @FollowsBlueprint adapter-external-service
export function startErrorReporting(settings: ErrorReportingSettings | undefined): void {
  if (settings === undefined) return;
  Sentry.init({
    dsn: settings.dsn,
    environment: settings.environment,
    ...(settings.release === undefined ? {} : { release: settings.release }),
    dataCollection: PRIVATE_DATA_COLLECTION,
  });
}

export async function reportUnhandledError(error: unknown): Promise<void> {
  if (!Sentry.isInitialized()) return;
  Sentry.captureException(error);
  await Sentry.flush(FLUSH_TIMEOUT_MILLISECONDS);
}
