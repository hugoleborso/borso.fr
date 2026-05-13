import { describe, expect, it } from 'vitest';
import { needsAdr } from '../src/adr-trigger.utils';
import { aggregateRun, type JournalEvent } from '../src/journal.utils';
import { getMaxRetries, nextAction, type VerdictKind } from '../src/retry-budget.utils';
import { advanceStage, incrementRetry, initialState, recordSpecChecksum } from '../src/state.utils';
import type { OrchestratorStage, OrchestratorState, SubAgentVerdict } from '../src/types';
import { parseVerdictFromMarkdown } from '../src/verdict-parser.utils';

const RUN_ID = 'r-toy';
const APP = 'meta';
const SLUG = 'toy';
const SPEC_CONTENT = '# Toy spec\n\nAdd a button.\n';
const MAX_RETRIES = getMaxRetries(undefined);

const T0 = '2026-05-13T10:00:00.000Z';
const T1 = '2026-05-13T10:01:00.000Z';

function verdict(yaml: string): SubAgentVerdict {
  return parseVerdictFromMarkdown(`---\n${yaml}\n---\n\nBody.\n`);
}

function verdictKindFor(parsed: SubAgentVerdict): VerdictKind {
  if (parsed.status === 'done') return 'pass';
  if (parsed.status === 'failed' && parsed.next?.kind === 'replan') return 'fail-plan';
  if (parsed.status === 'failed' && parsed.next?.kind === 'escalate') return 'fail-spec';
  if (parsed.status === 'failed') return 'fail-local';
  return 'crash';
}

type StageJournal = OrchestratorStage[];

function simulate(implementationVerdicts: SubAgentVerdict[]): {
  state: OrchestratorState;
  stages: StageJournal;
  retries: number;
} {
  let state = initialState({ runId: RUN_ID, app: APP, slug: SLUG, now: T0 });
  state = recordSpecChecksum(state, SPEC_CONTENT, T0);
  const stages: StageJournal = [state.stage];

  const advance = (toStage: OrchestratorStage): void => {
    state = advanceStage(state, toStage, T1);
    stages.push(toStage);
  };

  advance('plan');
  advance('adrs');
  advance('implement');

  for (const implementationVerdict of implementationVerdicts) {
    if (implementationVerdict.status === 'question') {
      continue;
    }
    advance('validate');
    advance('arbitrate');
    const verdictKind = verdictKindFor(implementationVerdict);
    if (verdictKind === 'pass') {
      advance('ship');
      return { state, stages, retries: state.retries.implement };
    }
    const action = nextAction(state.retries.implement, verdictKind, MAX_RETRIES);
    if (action === 'escalate') {
      advance('escalated');
      return { state, stages, retries: state.retries.implement };
    }
    state = incrementRetry(state, 'implement', T1);
    if (action === 'replan') {
      advance('plan');
      advance('implement');
    } else {
      advance('implement');
    }
  }
  throw new Error('simulation ran out of verdicts before reaching a terminal stage');
}

describe('scenario: happy path (validators PASS first try)', () => {
  it('walks spec → plan → adrs → implement → validate → arbitrate → ship without retries', () => {
    const happy = verdict('status: done\nsummary: ok\nartifacts: []');
    const { state, stages, retries } = simulate([happy]);
    expect(state.stage).toBe('ship');
    expect(retries).toBe(0);
    expect(stages).toEqual([
      'spec',
      'plan',
      'adrs',
      'implement',
      'validate',
      'arbitrate',
      'ship',
    ]);
  });
});

describe('scenario: validator returns fail-local, retry within budget then pass', () => {
  it('increments implement retries once and ships', () => {
    const failLocal = verdict('status: failed\nsummary: local typo\nartifacts: []');
    const pass = verdict('status: done\nsummary: fixed\nartifacts: []');
    const { state, retries } = simulate([failLocal, pass]);
    expect(state.stage).toBe('ship');
    expect(retries).toBe(1);
  });
});

describe('scenario: validator returns replan, plan re-entered then pass', () => {
  it('routes through plan stage a second time', () => {
    const replan = verdict(
      'status: failed\nsummary: plan flaw\nartifacts: []\nnext:\n  kind: replan\n  scope: test strategy',
    );
    const pass = verdict('status: done\nsummary: replanned\nartifacts: []');
    const { state, stages, retries } = simulate([replan, pass]);
    expect(state.stage).toBe('ship');
    expect(retries).toBe(1);
    const planVisits = stages.filter((stage) => stage === 'plan').length;
    expect(planVisits).toBe(2);
  });
});

describe('scenario: retry budget exhausted → escalated', () => {
  it('lands on `escalated` after MAX_RETRIES local failures', () => {
    const fail = verdict('status: failed\nsummary: still broken\nartifacts: []');
    const failures = Array.from({ length: MAX_RETRIES + 1 }, () => fail);
    const { state, retries } = simulate(failures);
    expect(state.stage).toBe('escalated');
    expect(retries).toBe(MAX_RETRIES);
  });
});

describe('scenario: spec-flaw verdict escalates immediately, no retry', () => {
  it('escalates on the first failed verdict that asks for escalation', () => {
    const escalateNow = verdict(
      'status: failed\nsummary: spec gap\nartifacts: []\nnext:\n  kind: escalate\n  reason: spec-gap-missing-palette',
    );
    const { state, retries } = simulate([escalateNow]);
    expect(state.stage).toBe('escalated');
    expect(retries).toBe(0);
  });
});

describe('scenario: implementation asks a question, orchestrator does not consume a retry', () => {
  it('keeps retries.implement at 0 across a question + done sequence', () => {
    const question = verdict(
      'status: question\nsummary: needs input\nartifacts: []\nnext:\n  kind: answer-needed\n  question: which library?',
    );
    const pass = verdict('status: done\nsummary: answered + done\nartifacts: []');
    const { state, retries } = simulate([question, pass]);
    expect(state.stage).toBe('ship');
    expect(retries).toBe(0);
  });
});

describe('scenario: ADR trigger detection on a typical architectural choice', () => {
  it('marks an ADR as needed when the cross-cutting flag is set', () => {
    const choice = {
      hasMultipleSeriousAlternatives: false,
      hasCrossCuttingImpact: true,
      divergesFromConvention: false,
      looksStandardOrExistsElsewhere: false,
    };
    expect(needsAdr(choice)).toBe(true);
  });

  it('does not mark a coding-style choice as needing an ADR', () => {
    const choice = {
      hasMultipleSeriousAlternatives: false,
      hasCrossCuttingImpact: false,
      divergesFromConvention: false,
      looksStandardOrExistsElsewhere: false,
    };
    expect(needsAdr(choice)).toBe(false);
  });
});

describe('scenario: journal aggregation across a happy run', () => {
  it('produces correct counts when ADRs, corrections, and a clean completion are present', () => {
    const events: JournalEvent[] = [
      { kind: 'run_started', runId: RUN_ID, app: APP, slug: SLUG, at: T0 },
      { kind: 'adr_written', runId: RUN_ID, number: 1, trigger: 'cross-cutting', at: T0 },
      { kind: 'human_message_received', runId: RUN_ID, category: 'guidance', at: T0 },
      { kind: 'human_message_received', runId: RUN_ID, category: 'correction', at: T0 },
      { kind: 'run_completed', runId: RUN_ID, finalStage: 'ship', at: T1 },
    ];
    const metrics = aggregateRun(events);
    expect(metrics.adrCount).toBe(1);
    expect(metrics.humanCorrections).toBe(1);
    expect(metrics.humanGuidance).toBe(1);
    expect(metrics.finalStage).toBe('ship');
    expect(metrics.durationMs).toBe(60_000);
  });
});
