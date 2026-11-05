/**
 * @DependsOnExternal sentry
 */

import { type ErrorReportingSettings, withoutPrivateContent } from '@domain/error-reporting.core';
import * as Sentry from '@sentry/react';

const NO_BREADCRUMBS = 0;

const OUTGOING_TRACE_PROPAGATION_TARGETS: string[] = [];

type ReportingOptions = NonNullable<Parameters<typeof Sentry.init>[0]>;

const PRIVATE_DATA_COLLECTION: ReportingOptions['dataCollection'] = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
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
