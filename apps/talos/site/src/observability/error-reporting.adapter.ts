/**
 * @DependsOnExternal sentry
 */

import { type BrowserReportingSettings, withoutPrivateContent } from '@domain/error-reporting.core';
import * as Sentry from '@sentry/react';
import {
  createRoutesFromChildren,
  matchRoutes,
  Routes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';

const NO_BREADCRUMBS = 0;

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
export function startErrorReporting(settings: BrowserReportingSettings | undefined): void {
  if (settings === undefined) return;
  Sentry.init({
    dsn: settings.dsn,
    environment: settings.environment,
    initialScope: { tags: SHARED_PROJECT_APP_TAGS },
    dataCollection: PRIVATE_DATA_COLLECTION,
    maxBreadcrumbs: NO_BREADCRUMBS,
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
    beforeSend: withoutPrivateContent,
  });
}

export const TracedRoutes = Sentry.wrapReactRouterRouting(Routes);
