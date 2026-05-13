import { describe, expect, it } from 'vitest';
import {
  advanceStage,
  assertSpecUnchanged,
  incrementRetry,
  initialState,
  recordAdr,
  recordContextBytes,
  recordSpecChecksum,
  specChecksum,
} from './state.utils';
import { OrchestratorSpecMutationAttemptedError } from './types';

const NOW = '2026-05-13T10:00:00.000Z';
const LATER = '2026-05-13T10:01:00.000Z';

function makeState() {
  return initialState({ runId: 'r1', app: 'meta', slug: 'demo', now: NOW });
}

describe('specChecksum', () => {
  it('is deterministic for identical inputs', () => {
    expect(specChecksum('hello')).toBe(specChecksum('hello'));
  });

  it('differs for different inputs', () => {
    expect(specChecksum('hello')).not.toBe(specChecksum('world'));
  });
});

describe('assertSpecUnchanged', () => {
  it('does not throw when the content matches the previous checksum', () => {
    const content = '# spec';
    const checksum = specChecksum(content);
    expect(() => assertSpecUnchanged(checksum, content)).not.toThrow();
  });

  it('throws OrchestratorSpecMutationAttemptedError when content changed', () => {
    const previous = specChecksum('original');
    expect(() => assertSpecUnchanged(previous, 'mutated')).toThrow(
      OrchestratorSpecMutationAttemptedError,
    );
  });
});

describe('initialState', () => {
  it('seeds the orchestrator at stage `spec` with zero retries and no ADRs', () => {
    const state = makeState();
    expect(state).toMatchObject({
      runId: 'r1',
      feature: { app: 'meta', slug: 'demo' },
      pilotedByTechLead: true,
      stage: 'spec',
      retries: { implement: 0, validate: 0 },
      adrIndex: [],
      bytesRead: 0,
      specChecksum: null,
      startedAt: NOW,
      updatedAt: NOW,
    });
  });
});

describe('advanceStage', () => {
  it('moves the stage forward and bumps updatedAt', () => {
    const next = advanceStage(makeState(), 'plan', LATER);
    expect(next.stage).toBe('plan');
    expect(next.updatedAt).toBe(LATER);
  });
});

describe('incrementRetry', () => {
  it('increments the implement counter without touching validate', () => {
    const next = incrementRetry(makeState(), 'implement', LATER);
    expect(next.retries).toEqual({ implement: 1, validate: 0 });
    expect(next.updatedAt).toBe(LATER);
  });

  it('increments the validate counter without touching implement', () => {
    const next = incrementRetry(makeState(), 'validate', LATER);
    expect(next.retries).toEqual({ implement: 0, validate: 1 });
  });
});

describe('recordSpecChecksum', () => {
  it('stores the sha256 of the spec content', () => {
    const next = recordSpecChecksum(makeState(), '# spec', LATER);
    expect(next.specChecksum).toBe(specChecksum('# spec'));
  });
});

describe('recordAdr', () => {
  it('appends the ADR number to the index', () => {
    const after = recordAdr(recordAdr(makeState(), 7, LATER), 8, LATER);
    expect(after.adrIndex).toEqual([7, 8]);
  });
});

describe('recordContextBytes', () => {
  it('accumulates bytes and emits a milestone the first time the 1 KiB line is crossed', () => {
    const start = makeState();
    const { state, crossedMilestone } = recordContextBytes(start, 1024, LATER);
    expect(state.bytesRead).toBe(1024);
    expect(crossedMilestone).toBe(1024);
  });

  it('does not emit a milestone when the next read stays below the next palier', () => {
    const start = makeState();
    const first = recordContextBytes(start, 1024, LATER);
    const second = recordContextBytes(first.state, 100, LATER);
    expect(second.crossedMilestone).toBeNull();
    expect(second.state.bytesRead).toBe(1124);
  });

  it('emits the next milestone (2 KiB) only when crossed', () => {
    const start = makeState();
    const first = recordContextBytes(start, 1024, LATER);
    const second = recordContextBytes(first.state, 1024, LATER);
    expect(second.crossedMilestone).toBe(2048);
  });

  it('skips multiple paliers when a single read crosses them and reports the highest crossed', () => {
    const start = makeState();
    const { crossedMilestone } = recordContextBytes(start, 8 * 1024, LATER);
    expect(crossedMilestone).toBe(8 * 1024);
  });

  it('emits no milestone when the cumulative bytes stay under 1 KiB', () => {
    const start = makeState();
    const { crossedMilestone, state } = recordContextBytes(start, 100, LATER);
    expect(crossedMilestone).toBeNull();
    expect(state.bytesRead).toBe(100);
  });
});
