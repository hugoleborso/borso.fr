/**
 * @DependsOnExternal sentry
 */

import * as Sentry from '@sentry/react';
import { useEffect } from 'react';
import {
  createRoutesFromChildren,
  matchRoutes,
  Routes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';
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
    tracesSampleRate: settings.tracesSampleRate,
    tracePropagationTargets: [...settings.tracePropagationTargets],
    integrations: [
      Sentry.reactRouterBrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
    ],
  });
}

export function reportRenderFailure(
  error: unknown,
  componentStack: string | null | undefined,
): void {
  Sentry.captureReactException(error, { componentStack });
}

export const TracedRoutes = Sentry.wrapReactRouterRouting(Routes);
