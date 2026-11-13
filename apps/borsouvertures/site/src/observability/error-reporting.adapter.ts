/**
 * @DependsOnExternal sentry
 */

import * as Sentry from '@sentry/react';
import type { ErrorReportingSettings, ProductEvent } from './error-reporting.core';

type ReportingOptions = NonNullable<Parameters<typeof Sentry.init>[0]>;

const PRIVATE_DATA_COLLECTION: ReportingOptions['dataCollection'] = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
};

const NO_OWN_API_TO_PROPAGATE_TRACES_TO: RegExp[] = [];

const SHARED_PROJECT_APP_TAGS = { app: 'borsouvertures' } as const;

// @FollowsBlueprint adapter-external-service
export function startErrorReporting(settings: ErrorReportingSettings): void {
  Sentry.init({
    dsn: settings.dsn,
    environment: settings.environment,
    initialScope: { tags: SHARED_PROJECT_APP_TAGS },
    dataCollection: PRIVATE_DATA_COLLECTION,
    tracesSampleRate: settings.tracesSampleRate,
    tracePropagationTargets: NO_OWN_API_TO_PROPAGATE_TRACES_TO,
    integrations: [Sentry.browserTracingIntegration()],
  });
}

// @FollowsBlueprint observability-adapter
export function recordProductEvent(event: ProductEvent): void {
  const { name, ...details } = event;
  Sentry.addBreadcrumb({
    category: 'product',
    type: 'info',
    level: 'info',
    message: name,
    data: details,
  });
}

export function reportTaggedError(error: unknown, tags: Record<string, string>): void {
  Sentry.captureException(error, { tags });
}
