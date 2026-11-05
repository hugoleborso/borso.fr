// @FollowsBlueprint environment-reader
export function readErrorReportingDsn(): unknown {
  return import.meta.env.VITE_SENTRY_DSN;
}
