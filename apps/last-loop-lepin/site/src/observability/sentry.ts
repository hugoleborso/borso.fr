import * as Sentry from '@sentry/react';
import { composeApiTraceTarget, selectApiBase } from '../lib/api-base.utils';
import { readApiBaseSetting, readSentryDsn, readStageName } from '../lib/environment';

const UNKNOWN_STAGE = 'unknown';

const TRACE_SAMPLE_RATE = 1;

type ReportingOptions = NonNullable<Parameters<typeof Sentry.init>[0]>;

const PRIVATE_DATA_COLLECTION: ReportingOptions['dataCollection'] = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
};

const SHARED_PROJECT_APP_TAGS = { app: 'last-loop-lepin' } as const;

export function initSentry(): void {
  const dsn = readSentryDsn();
  if (dsn === undefined) return;
  Sentry.init({
    dsn,
    environment: readStageName() ?? UNKNOWN_STAGE,
    initialScope: { tags: SHARED_PROJECT_APP_TAGS },
    dataCollection: PRIVATE_DATA_COLLECTION,
    tracesSampleRate: TRACE_SAMPLE_RATE,
    tracePropagationTargets: [
      composeApiTraceTarget(selectApiBase(readApiBaseSetting()), window.location.origin),
    ],
    integrations: [Sentry.browserTracingIntegration()],
  });
}

/**
 * @Blueprint observability-adapter
 * @BlueprintName Observability Adapter
 * @BlueprintUsage Use for the one module a front end calls to report an event, so no component imports the vendor SDK.
 * @BlueprintDescription Wraps `Sentry.addBreadcrumb` behind a function whose `event` parameter is a closed union of the event names this application emits, so a typo is a type error rather than a name that never appears in a dashboard. The category, type, and level are fixed here, which is what makes the recorded events comparable, and the initialisation beside it reads its configuration through `lib/environment.ts` and returns without starting Sentry when no project is configured.
 */
export function recordAnalyticsEvent(
  event: 'loop_punched' | 'dnf_validated' | 'correction_applied' | 'gpx_uploaded' | 'race_finished',
  payload: Record<string, unknown> = {},
): void {
  Sentry.addBreadcrumb({
    category: 'analytics',
    type: 'info',
    level: 'info',
    message: event,
    data: payload,
  });
}

// @FollowsBlueprint observability-adapter
export function recordDiagnosticEvent(
  subject: 'runner_photo' | 'course_map',
  event: 'runner_photo_load_failed' | 'runner_positions_projected',
  payload: Record<string, unknown> = {},
): void {
  Sentry.addBreadcrumb({
    category: subject,
    type: 'debug',
    level: 'info',
    message: event,
    data: payload,
  });
}
