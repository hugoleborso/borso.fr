const REPORTING_ENVIRONMENT = 'prod';

const TRACE_SAMPLE_RATE = 1;

const API_PATH_PREFIX = '/api/';

const REGULAR_EXPRESSION_SYNTAX = /[.*+?^${}()|[\]\\/]/g;

export interface ErrorReportingInputs {
  readonly dsn: unknown;
  readonly release?: unknown;
}

export interface ErrorReportingSettings {
  readonly dsn: string;
  readonly environment: typeof REPORTING_ENVIRONMENT;
  readonly tracesSampleRate: number;
  readonly release?: string;
}

export interface BrowserReportingInputs {
  readonly dsn: unknown;
  readonly pageOrigin: string;
}

export interface BrowserReportingSettings extends ErrorReportingSettings {
  readonly tracePropagationTargets: readonly RegExp[];
}

export interface PrivateEventContent {
  readonly request?: unknown;
  readonly user?: unknown;
  readonly breadcrumbs?: unknown;
  readonly extra?: unknown;
}

function isConfiguredText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function escapeForRegularExpression(text: string): string {
  return text.replace(REGULAR_EXPRESSION_SYNTAX, '\\$&');
}

// @FollowsBlueprint core-decision
export function selectErrorReportingSettings(
  inputs: ErrorReportingInputs,
): ErrorReportingSettings | undefined {
  if (!isConfiguredText(inputs.dsn)) return undefined;
  return {
    dsn: inputs.dsn,
    environment: REPORTING_ENVIRONMENT,
    tracesSampleRate: TRACE_SAMPLE_RATE,
    ...(isConfiguredText(inputs.release) ? { release: inputs.release } : {}),
  };
}

export function selectTracePropagationTargets(pageOrigin: string): readonly RegExp[] {
  return [new RegExp(`^${escapeForRegularExpression(`${pageOrigin}${API_PATH_PREFIX}`)}`)];
}

export function selectBrowserReportingSettings(
  inputs: BrowserReportingInputs,
): BrowserReportingSettings | undefined {
  const settings = selectErrorReportingSettings({ dsn: inputs.dsn });
  if (settings === undefined) return undefined;
  return { ...settings, tracePropagationTargets: selectTracePropagationTargets(inputs.pageOrigin) };
}

export function withoutPrivateContent<Event extends PrivateEventContent>(
  event: Event,
): Omit<Event, keyof PrivateEventContent> {
  const { request, user, breadcrumbs, extra, ...reportable } = event;
  return reportable;
}
