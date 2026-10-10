import type { ErrorReportingInputs } from './error-reporting.core';

// @FollowsBlueprint environment-reader
export function readErrorReportingInputs(): ErrorReportingInputs {
  return {
    dsn: import.meta.env.VITE_SENTRY_DSN,
    stage: import.meta.env.VITE_STAGE,
    apiBase: import.meta.env.VITE_API_BASE,
    pageOrigin: window.location.origin,
  };
}
