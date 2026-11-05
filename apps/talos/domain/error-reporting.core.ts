const REPORTING_ENVIRONMENT = 'prod';

export interface ErrorReportingSettings {
  readonly dsn: string;
  readonly environment: typeof REPORTING_ENVIRONMENT;
}

export interface PrivateEventContent {
  readonly request?: unknown;
  readonly user?: unknown;
  readonly breadcrumbs?: unknown;
  readonly extra?: unknown;
}

// @FollowsBlueprint core-decision
export function selectErrorReportingSettings(dsn: unknown): ErrorReportingSettings | undefined {
  if (typeof dsn !== 'string' || dsn.length === 0) return undefined;
  return { dsn, environment: REPORTING_ENVIRONMENT };
}

export function withoutPrivateContent<Event extends PrivateEventContent>(
  event: Event,
): Omit<Event, keyof PrivateEventContent> {
  const { request, user, breadcrumbs, extra, ...reportable } = event;
  return reportable;
}
