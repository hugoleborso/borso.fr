const REPORTING_STAGES = ['preview', 'prod'] as const;

const TRACE_SAMPLE_RATE = 1;

const API_PATH_PREFIX = '/api/';

const TRAILING_SLASHES = /\/+$/;

const REGULAR_EXPRESSION_SYNTAX = /[.*+?^${}()|[\]\\/]/g;

export type ReportingStage = (typeof REPORTING_STAGES)[number];

export interface ErrorReportingInputs {
  readonly dsn: unknown;
  readonly stage: unknown;
  readonly release: unknown;
}

export interface BrowserReportingInputs {
  readonly dsn: unknown;
  readonly stage: unknown;
  readonly apiBase: unknown;
  readonly pageOrigin: string;
}

interface ReportingProject {
  readonly dsn: string;
  readonly environment: ReportingStage;
  readonly tracesSampleRate: number;
}

export interface ErrorReportingSettings extends ReportingProject {
  readonly release?: string;
}

export interface BrowserReportingSettings extends ReportingProject {
  readonly tracePropagationTargets: readonly RegExp[];
}

function isReportingStage(stage: unknown): stage is ReportingStage {
  return REPORTING_STAGES.some((reportingStage) => reportingStage === stage);
}

function isConfiguredText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function selectReportingProject(dsn: unknown, stage: unknown): ReportingProject | undefined {
  if (!isConfiguredText(dsn) || !isReportingStage(stage)) return undefined;
  return { dsn, environment: stage, tracesSampleRate: TRACE_SAMPLE_RATE };
}

function escapeForRegularExpression(text: string): string {
  return text.replace(REGULAR_EXPRESSION_SYNTAX, '\\$&');
}

function selectApiOrigin(apiBase: unknown, pageOrigin: string): string {
  return isConfiguredText(apiBase) ? apiBase.replace(TRAILING_SLASHES, '') : pageOrigin;
}

// @FollowsBlueprint core-decision
export function selectErrorReportingSettings(
  inputs: ErrorReportingInputs,
): ErrorReportingSettings | undefined {
  const project = selectReportingProject(inputs.dsn, inputs.stage);
  if (project === undefined) return undefined;
  return isConfiguredText(inputs.release) ? { ...project, release: inputs.release } : project;
}

export function selectTracePropagationTargets(
  apiBase: unknown,
  pageOrigin: string,
): readonly RegExp[] {
  const apiOrigin = selectApiOrigin(apiBase, pageOrigin);
  return [new RegExp(`^${escapeForRegularExpression(`${apiOrigin}${API_PATH_PREFIX}`)}`)];
}

export function selectBrowserReportingSettings(
  inputs: BrowserReportingInputs,
): BrowserReportingSettings | undefined {
  const project = selectReportingProject(inputs.dsn, inputs.stage);
  if (project === undefined) return undefined;
  return {
    ...project,
    tracePropagationTargets: selectTracePropagationTargets(inputs.apiBase, inputs.pageOrigin),
  };
}
