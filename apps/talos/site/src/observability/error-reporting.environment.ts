import type { BrowserReportingInputs } from '@domain/error-reporting.core';

// @FollowsBlueprint environment-reader
export function readErrorReportingInputs(): BrowserReportingInputs {
  return { dsn: import.meta.env.VITE_SENTRY_DSN, pageOrigin: window.location.origin };
}
