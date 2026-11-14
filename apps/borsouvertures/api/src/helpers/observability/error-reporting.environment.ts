import type { ErrorReportingInputs } from './error-reporting.core';

// @FollowsBlueprint environment-reader
export function readErrorReportingInputs(): ErrorReportingInputs {
  return {
    dsn: process.env.SENTRY_DSN,
    stage: process.env.STAGE,
    release: process.env.SENTRY_RELEASE,
  };
}
