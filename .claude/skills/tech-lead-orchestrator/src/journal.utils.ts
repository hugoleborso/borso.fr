import type { OrchestratorStage } from './types';

type HumanMessageCategory = 'guidance' | 'correction' | 'answer';

export type JournalEvent =
  | { kind: 'run_started'; runId: string; app: string; slug: string; at: string }
  | {
      kind: 'stage_changed';
      runId: string;
      from: OrchestratorStage;
      to: OrchestratorStage;
      at: string;
    }
  | { kind: 'adr_written'; runId: string; number: number; trigger: string; at: string }
  | {
      kind: 'escalation';
      runId: string;
      reason: string;
      stage: OrchestratorStage;
      retries: number;
      at: string;
    }
  | {
      kind: 'human_message_received';
      runId: string;
      category: HumanMessageCategory;
      at: string;
    }
  | { kind: 'context_growth'; runId: string; bytes: number; at: string }
  | { kind: 'visual_validation_skipped'; runId: string; reason: string; at: string }
  | {
      kind: 'run_completed';
      runId: string;
      finalStage: OrchestratorStage;
      at: string;
    };

const VALID_EVENT_KINDS = new Set([
  'run_started',
  'stage_changed',
  'adr_written',
  'escalation',
  'human_message_received',
  'context_growth',
  'visual_validation_skipped',
  'run_completed',
]);

export function serializeEvent(event: JournalEvent): string {
  return JSON.stringify(event);
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isJournalEvent(candidate: unknown): candidate is JournalEvent {
  if (!isObjectRecord(candidate)) return false;
  if (typeof candidate.kind !== 'string') return false;
  return VALID_EVENT_KINDS.has(candidate.kind);
}

export function parseEvent(line: string): JournalEvent | null {
  const trimmed = line.trim();
  if (trimmed === '') return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  return isJournalEvent(parsed) ? parsed : null;
}

type RunMetrics = {
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  humanCorrections: number;
  humanGuidance: number;
  humanAnswers: number;
  adrCount: number;
  escalationCount: number;
  timeToFirstEscalationMs: number | null;
  visualValidationSkipped: boolean;
  finalStage: OrchestratorStage | null;
};

function timestampDiffMs(later: string, earlier: string): number {
  return new Date(later).getTime() - new Date(earlier).getTime();
}

export function aggregateRun(events: ReadonlyArray<JournalEvent>): RunMetrics {
  let startedAt: string | null = null;
  let completedAt: string | null = null;
  let firstEscalationAt: string | null = null;
  let humanCorrections = 0;
  let humanGuidance = 0;
  let humanAnswers = 0;
  let adrCount = 0;
  let escalationCount = 0;
  let visualValidationSkipped = false;
  let finalStage: OrchestratorStage | null = null;

  for (const event of events) {
    if (event.kind === 'run_started') startedAt = event.at;
    if (event.kind === 'run_completed') {
      completedAt = event.at;
      finalStage = event.finalStage;
    }
    if (event.kind === 'adr_written') adrCount++;
    if (event.kind === 'escalation') {
      escalationCount++;
      if (firstEscalationAt === null) firstEscalationAt = event.at;
    }
    if (event.kind === 'human_message_received') {
      if (event.category === 'correction') humanCorrections++;
      else if (event.category === 'guidance') humanGuidance++;
      else humanAnswers++;
    }
    if (event.kind === 'visual_validation_skipped') visualValidationSkipped = true;
  }

  const durationMs =
    startedAt !== null && completedAt !== null ? timestampDiffMs(completedAt, startedAt) : null;
  const timeToFirstEscalationMs =
    startedAt !== null && firstEscalationAt !== null
      ? timestampDiffMs(firstEscalationAt, startedAt)
      : null;

  return {
    startedAt,
    completedAt,
    durationMs,
    humanCorrections,
    humanGuidance,
    humanAnswers,
    adrCount,
    escalationCount,
    timeToFirstEscalationMs,
    visualValidationSkipped,
    finalStage,
  };
}
