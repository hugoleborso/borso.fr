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

export interface TakeUploadFailure {
  readonly stage: 'sign' | 'put' | 'create';
  readonly status: number | null;
}

const TAKE_UPLOAD_FAILED = 'TakeUploadFailed';
const TAKE_QUEUE_WRITE_FAILED = 'TakeQueueWriteFailed';
const TAKES_BREADCRUMB_CATEGORY = 'takes';
const NO_STATUS = 'none';

export function reportTakeUploadFailed(failure: TakeUploadFailure): void {
  Sentry.captureMessage(TAKE_UPLOAD_FAILED, {
    level: 'error',
    tags: { 'take.stage': failure.stage, 'take.status': String(failure.status ?? NO_STATUS) },
  });
}

export function reportTakeQueueWriteFailed(error: unknown): void {
  Sentry.captureException(error, {
    tags: { 'take.stage': 'queue' },
    extra: { name: TAKE_QUEUE_WRITE_FAILED },
  });
}

export type TakeBreadcrumb = 'RecordingInterrupted' | 'take_upload_retried';

export function recordTakeBreadcrumb(message: TakeBreadcrumb): void {
  Sentry.addBreadcrumb({ category: TAKES_BREADCRUMB_CATEGORY, message, level: 'info' });
}

export const TracedRoutes = Sentry.wrapReactRouterRouting(Routes);
