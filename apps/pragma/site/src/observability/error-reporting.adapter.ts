/**
 * @DependsOnExternal sentry
 */

import * as Sentry from '@sentry/react';
import {
  createRoutesFromChildren,
  matchRoutes,
  Routes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';
import type { TakeStepFailure } from '../lib/take-queue.core';
import type { ErrorReportingSettings } from './error-reporting.core';

type ReportingOptions = NonNullable<Parameters<typeof Sentry.init>[0]>;

const PRIVATE_DATA_COLLECTION: ReportingOptions['dataCollection'] = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
};

const SHARED_PROJECT_APP_TAGS = { app: 'pragma' } as const;

// @FollowsBlueprint adapter-external-service
export function startErrorReporting(settings: ErrorReportingSettings | undefined): void {
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
  error: unknown,
  componentStack: string | null | undefined,
): void {
  Sentry.captureReactException(error, { componentStack });
}

const TAKE_UPLOAD_FAILED = 'TakeUploadFailed';
const TAKE_QUEUE_WRITE_FAILED = 'TakeQueueWriteFailed';
const TAKES_BREADCRUMB_CATEGORY = 'takes';
const NO_STATUS = 'none';

export function reportTakeUploadFailed(failure: TakeStepFailure): void {
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

const ENTRY_NOTE_SAVE_ERROR = 'EntryNoteSaveError';

export function reportEntryNoteSaveFailed(setlistId: string): void {
  Sentry.captureMessage(ENTRY_NOTE_SAVE_ERROR, {
    level: 'error',
    tags: { 'setlist.id': setlistId },
  });
}

const SETLIST_BATCH_ADD_ERROR = 'SetlistBatchAddError';

export function reportSetlistBatchAddFailed(setlistId: string): void {
  Sentry.captureMessage(SETLIST_BATCH_ADD_ERROR, {
    level: 'error',
    tags: { 'setlist.id': setlistId },
  });
}

export type TakeBreadcrumb = 'RecordingInterrupted' | 'take_upload_retried';

export function recordTakeBreadcrumb(message: TakeBreadcrumb): void {
  Sentry.addBreadcrumb({ category: TAKES_BREADCRUMB_CATEGORY, message, level: 'info' });
}

export const TracedRoutes = Sentry.wrapReactRouterRouting(Routes);
