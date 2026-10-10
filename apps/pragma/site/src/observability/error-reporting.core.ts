const REPORTING_STAGES = ['preview', 'integ', 'prod'] as const;

const TRACE_SAMPLE_RATE = 1;

const API_PATH_PREFIX = '/api/';

const TRAILING_SLASHES = /\/+$/;

const REGULAR_EXPRESSION_SYNTAX = /[.*+?^${}()|[\]\\/]/g;

export type ReportingStage = (typeof REPORTING_STAGES)[number];

export interface ErrorReportingInputs {
  readonly dsn: unknown;
  readonly stage: unknown;
  readonly apiBase: unknown;
  readonly pageOrigin: string;
}

export interface ErrorReportingSettings {
  readonly dsn: string;
  readonly environment: ReportingStage;
  readonly tracesSampleRate: number;
  readonly tracePropagationTargets: readonly RegExp[];
}

function isReportingStage(stage: unknown): stage is ReportingStage {
  return REPORTING_STAGES.some((reportingStage) => reportingStage === stage);
}

function isConfiguredText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function escapeForRegularExpression(text: string): string {
  return text.replace(REGULAR_EXPRESSION_SYNTAX, '\\$&');
}

function selectApiOrigin(apiBase: unknown, pageOrigin: string): string {
  return isConfiguredText(apiBase) ? apiBase.replace(TRAILING_SLASHES, '') : pageOrigin;
}

export function selectTracePropagationTargets(
  apiBase: unknown,
  pageOrigin: string,
): readonly RegExp[] {
  const apiOrigin = selectApiOrigin(apiBase, pageOrigin);
  return [new RegExp(`^${escapeForRegularExpression(`${apiOrigin}${API_PATH_PREFIX}`)}`)];
}

// @FollowsBlueprint core-decision
export function selectErrorReportingSettings(
  inputs: ErrorReportingInputs,
): ErrorReportingSettings | undefined {
  if (!isConfiguredText(inputs.dsn) || !isReportingStage(inputs.stage)) return undefined;
  return {
    dsn: inputs.dsn,
    environment: inputs.stage,
    tracesSampleRate: TRACE_SAMPLE_RATE,
    tracePropagationTargets: selectTracePropagationTargets(inputs.apiBase, inputs.pageOrigin),
  };
}
