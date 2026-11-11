const REPORTING_STAGES = ['preview', 'integ', 'prod'] as const;

const TRACE_SAMPLE_RATE = 1;

export type ReportingStage = (typeof REPORTING_STAGES)[number];

export interface ErrorReportingInputs {
  readonly dsn: string | undefined;
  readonly stage: string | undefined;
  readonly release: string | undefined;
}

export interface ErrorReportingSettings {
  readonly dsn: string;
  readonly environment: ReportingStage;
  readonly tracesSampleRate: number;
  readonly release?: string;
}

function isReportingStage(stage: string | undefined): stage is ReportingStage {
  return REPORTING_STAGES.some((reportingStage) => reportingStage === stage);
}

// @FollowsBlueprint core-decision
export function selectErrorReportingSettings(
  inputs: ErrorReportingInputs,
): ErrorReportingSettings | undefined {
  if (inputs.dsn === undefined || !isReportingStage(inputs.stage)) return undefined;
  return {
    dsn: inputs.dsn,
    environment: inputs.stage,
    tracesSampleRate: TRACE_SAMPLE_RATE,
    ...(inputs.release === undefined ? {} : { release: inputs.release }),
  };
}
