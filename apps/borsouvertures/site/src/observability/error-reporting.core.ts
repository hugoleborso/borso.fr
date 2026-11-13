import type { CardKind, ReviewOutcome } from '@domain/review-event.core';

const REPORTING_STAGES = ['preview', 'prod'] as const;

const TRACE_SAMPLE_RATE = 1;

export type ReportingStage = (typeof REPORTING_STAGES)[number];

export interface ErrorReportingInputs {
  readonly dsn: unknown;
  readonly stage: unknown;
}

export interface ErrorReportingSettings {
  readonly dsn: string;
  readonly environment: ReportingStage;
  readonly tracesSampleRate: number;
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
  return { dsn: inputs.dsn, environment: inputs.stage, tracesSampleRate: TRACE_SAMPLE_RATE };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readErrorTags(error: unknown): Record<string, string> {
  if (!isPlainRecord(error) || !isPlainRecord(error.tags)) return {};
  const tags: Record<string, string> = {};
  for (const [name, value] of Object.entries(error.tags)) {
    if (typeof value === 'string') tags[name] = value;
  }
  return tags;
}

export type ProductEvent =
  | { name: 'review_session_started' }
  | { name: 'review_session_completed' }
  | { name: 'card_reviewed'; cardKind: CardKind; outcome: ReviewOutcome }
  | { name: 'new_cards_introduced'; count: number }
  | { name: 'deck_opened'; deckId: string }
  | { name: 'opponent_game_started'; deckId: string }
  | { name: 'opponent_left_deck'; deckId: string }
  | { name: 'sync_completed'; pushed: number; pulled: number };
