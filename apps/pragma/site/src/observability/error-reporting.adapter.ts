/**
 * @DependsOnExternal sentry
 */

import * as Sentry from '@sentry/react';
import type { ErrorReportingSettings } from './error-reporting.core';

type ReportingOptions = NonNullable<Parameters<typeof Sentry.init>[0]>;

const PRIVATE_DATA_COLLECTION: ReportingOptions['dataCollection'] = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
};

// @FollowsBlueprint adapter-external-service
export function startErrorReporting(settings: ErrorReportingSettings | undefined): void {
  if (settings === undefined) return;
  Sentry.init({
    dsn: settings.dsn,
    environment: settings.environment,
    dataCollection: PRIVATE_DATA_COLLECTION,
  });
}

export function reportRenderFailure(
  error: unknown,
  componentStack: string | null | undefined,
): void {
  Sentry.captureReactException(error, { componentStack });
}
