const REPORTING_STAGES = ['preview', 'prod'] as const;

const TRACE_SAMPLE_RATE = 1;

export type ReportingStage = (typeof REPORTING_STAGES)[number];

export interface ErrorReportingInputs {
  readonly dsn: unknown;
  readonly stage: unknown;
  readonly release: unknown;
}

export interface ErrorReportingSettings {
  readonly dsn: string;
  readonly environment: ReportingStage;
  readonly tracesSampleRate: number;
  readonly release?: string;
}

function isReportingStage(stage: unknown): stage is ReportingStage {
  return REPORTING_STAGES.some((reportingStage) => reportingStage === stage);
}

function isConfiguredText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

// @FollowsBlueprint core-decision
export function selectApiErrorReportingSettings(
  inputs: ErrorReportingInputs,
): ErrorReportingSettings | undefined {
  if (!isConfiguredText(inputs.dsn) || !isReportingStage(inputs.stage)) return undefined;
  const project = {
    dsn: inputs.dsn,
    environment: inputs.stage,
    tracesSampleRate: TRACE_SAMPLE_RATE,
  };
  return isConfiguredText(inputs.release) ? { ...project, release: inputs.release } : project;
}
