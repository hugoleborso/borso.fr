// @FollowsBlueprint environment-reader
export function readErrorReportingDsn(): string | undefined {
  return process.env.SENTRY_DSN;
}
