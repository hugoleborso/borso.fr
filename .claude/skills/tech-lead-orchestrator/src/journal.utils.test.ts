import { describe, expect, it } from 'vitest';
import { aggregateRun, type JournalEvent, parseEvent, serializeEvent } from './journal.utils';

const RUN_ID = 'r1';
const T0 = '2026-05-13T10:00:00.000Z';
const T1 = '2026-05-13T10:05:00.000Z';
const T2 = '2026-05-13T10:10:00.000Z';

describe('serializeEvent / parseEvent', () => {
  it('round-trips a run_started event', () => {
    const event: JournalEvent = {
      kind: 'run_started',
      runId: RUN_ID,
      app: 'meta',
      slug: 'demo',
      at: T0,
    };
    expect(parseEvent(serializeEvent(event))).toEqual(event);
  });

  it('returns null for an empty line', () => {
    expect(parseEvent('   ')).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    expect(parseEvent('{not json')).toBeNull();
  });

  it('returns null for a JSON scalar', () => {
    expect(parseEvent('"just a string"')).toBeNull();
  });

  it('returns null for a JSON array', () => {
    expect(parseEvent('[]')).toBeNull();
  });

  it('returns null when kind is missing or unknown', () => {
    expect(parseEvent('{}')).toBeNull();
    expect(parseEvent(JSON.stringify({ kind: 'invented' }))).toBeNull();
  });
});

describe('aggregateRun', () => {
  it('returns null timestamps and zero counts for an empty event list', () => {
    expect(aggregateRun([])).toEqual({
      startedAt: null,
      completedAt: null,
      durationMs: null,
      humanCorrections: 0,
      humanGuidance: 0,
      humanAnswers: 0,
      adrCount: 0,
      escalationCount: 0,
      timeToFirstEscalationMs: null,
      visualValidationSkipped: false,
      finalStage: null,
    });
  });

  it('counts ADRs, classifies human messages, and computes durations on a happy run', () => {
    const events: JournalEvent[] = [
      { kind: 'run_started', runId: RUN_ID, app: 'meta', slug: 'demo', at: T0 },
      { kind: 'adr_written', runId: RUN_ID, number: 1, trigger: 'multiple-alternatives', at: T0 },
      { kind: 'adr_written', runId: RUN_ID, number: 2, trigger: 'cross-cutting', at: T0 },
      { kind: 'human_message_received', runId: RUN_ID, category: 'guidance', at: T0 },
      { kind: 'human_message_received', runId: RUN_ID, category: 'correction', at: T0 },
      { kind: 'human_message_received', runId: RUN_ID, category: 'answer', at: T0 },
      { kind: 'run_completed', runId: RUN_ID, finalStage: 'ship', at: T2 },
    ];
    const metrics = aggregateRun(events);
    expect(metrics.adrCount).toBe(2);
    expect(metrics.humanCorrections).toBe(1);
    expect(metrics.humanGuidance).toBe(1);
    expect(metrics.humanAnswers).toBe(1);
    expect(metrics.durationMs).toBe(600_000);
    expect(metrics.finalStage).toBe('ship');
    expect(metrics.timeToFirstEscalationMs).toBeNull();
  });

  it('captures the time-to-first-escalation when one or more escalations occur', () => {
    const events: JournalEvent[] = [
      { kind: 'run_started', runId: RUN_ID, app: 'meta', slug: 'demo', at: T0 },
      {
        kind: 'escalation',
        runId: RUN_ID,
        reason: 'spec gap',
        stage: 'arbitrate',
        retries: 1,
        at: T1,
      },
      {
        kind: 'escalation',
        runId: RUN_ID,
        reason: 'another',
        stage: 'arbitrate',
        retries: 2,
        at: T2,
      },
    ];
    const metrics = aggregateRun(events);
    expect(metrics.escalationCount).toBe(2);
    expect(metrics.timeToFirstEscalationMs).toBe(300_000);
  });

  it('flags visual_validation_skipped when present', () => {
    const events: JournalEvent[] = [
      { kind: 'visual_validation_skipped', runId: RUN_ID, reason: 'no UI', at: T0 },
    ];
    expect(aggregateRun(events).visualValidationSkipped).toBe(true);
  });

  it('ignores context_growth and stage_changed events for the metrics (they are diagnostic)', () => {
    const events: JournalEvent[] = [
      { kind: 'run_started', runId: RUN_ID, app: 'meta', slug: 'demo', at: T0 },
      { kind: 'context_growth', runId: RUN_ID, bytes: 1024, at: T0 },
      { kind: 'stage_changed', runId: RUN_ID, from: 'spec', to: 'plan', at: T0 },
      { kind: 'run_completed', runId: RUN_ID, finalStage: 'ship', at: T1 },
    ];
    const metrics = aggregateRun(events);
    expect(metrics.adrCount).toBe(0);
    expect(metrics.escalationCount).toBe(0);
    expect(metrics.durationMs).toBe(300_000);
  });
});
