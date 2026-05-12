import * as Sentry from '@sentry/react';

function readMetaEnv(name: string): string | undefined {
  const env: Record<string, unknown> = import.meta.env;
  const value = env[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function initSentry(): void {
  const dsn = readMetaEnv('VITE_SENTRY_DSN');
  if (dsn === undefined) return;
  Sentry.init({
    dsn,
    environment: readMetaEnv('VITE_STAGE') ?? 'unknown',
    tracesSampleRate: 0,
  });
}

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
