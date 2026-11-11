import type { ErrorReportingInputs } from './error-reporting.core';

function readOptional(variableName: string): string | undefined {
  const value = process.env[variableName];
  return value === undefined || value === '' ? undefined : value;
}

// @FollowsBlueprint environment-reader
export function readErrorReportingInputs(): ErrorReportingInputs {
  return {
    dsn: readOptional('SENTRY_DSN'),
    stage: readOptional('STAGE'),
    release: readOptional('SENTRY_RELEASE'),
  };
}
