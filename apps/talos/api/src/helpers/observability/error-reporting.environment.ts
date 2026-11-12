import type { ErrorReportingInputs } from '@domain/error-reporting.core';

// @FollowsBlueprint environment-reader
export function readErrorReportingInputs(): ErrorReportingInputs {
  return { dsn: process.env.SENTRY_DSN, release: process.env.SENTRY_RELEASE };
}
