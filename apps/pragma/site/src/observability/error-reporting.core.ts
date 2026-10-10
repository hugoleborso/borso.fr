const REPORTING_STAGES = ['preview', 'integ', 'prod'] as const;

export type ReportingStage = (typeof REPORTING_STAGES)[number];

export interface ErrorReportingInputs {
  readonly dsn: unknown;
  readonly stage: unknown;
}

export interface ErrorReportingSettings {
  readonly dsn: string;
  readonly environment: ReportingStage;
}

function isReportingStage(stage: unknown): stage is ReportingStage {
  return REPORTING_STAGES.some((reportingStage) => reportingStage === stage);
}

function isConfiguredText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

// @FollowsBlueprint core-decision
export function selectErrorReportingSettings(
  inputs: ErrorReportingInputs,
): ErrorReportingSettings | undefined {
  if (!isConfiguredText(inputs.dsn) || !isReportingStage(inputs.stage)) return undefined;
  return { dsn: inputs.dsn, environment: inputs.stage };
}
