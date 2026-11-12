/**
 * @DependsOnExternal sentry
 */

import type { BrowserReportingSettings } from '@domain/error-reporting.core';
import * as Sentry from '@sentry/react';
import {
  createRoutesFromChildren,
  matchRoutes,
  Routes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';

type ReportingOptions = NonNullable<Parameters<typeof Sentry.init>[0]>;

const PRIVATE_DATA_COLLECTION: ReportingOptions['dataCollection'] = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
};

const SHARED_PROJECT_APP_TAGS = { app: 'banana-rush' } as const;

// @FollowsBlueprint adapter-external-service
export function startErrorReporting(settings: BrowserReportingSettings | undefined): void {
  if (settings === undefined) return;
  Sentry.init({
    dsn: settings.dsn,
    environment: settings.environment,
    initialScope: { tags: SHARED_PROJECT_APP_TAGS },
    dataCollection: PRIVATE_DATA_COLLECTION,
    tracesSampleRate: settings.tracesSampleRate,
    tracePropagationTargets: [...settings.tracePropagationTargets],
    integrations: [
      Sentry.reactRouterBrowserTracingIntegration({
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
    ],
  });
}

export function reportRenderFailure(
  failure: unknown,
  componentStack: string | null | undefined,
): void {
  Sentry.captureReactException(failure, { componentStack });
}

export const TracedRoutes = Sentry.wrapReactRouterRouting(Routes);
