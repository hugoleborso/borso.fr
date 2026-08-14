import { describe, expect, it } from 'vitest';
import { ApiError } from '../../lib/api-error';
import type { RankedRunnerDto } from '../../lib/race.types';
import {
  initialSelfPunchState,
  nextStep,
  readValidatedLoopIndex,
  selectFailureEvent,
  selectRejectionEvent,
  selectTargetLoopIndex,
  type SelfPunchState,
} from './self-punch.core';

function buildRunner(status: RankedRunnerDto['status']): RankedRunnerDto {
  return {
    runner: {
      editionSlug: 'lepin-2026',
      slug: 'alice',
      displayName: 'Alice',
      photoKey: null,
      photoUrl: null,
      bib: 1,
    },
    rank: 1,
    status,
    lastLoopDurationMs: null,
    lastFinishedAt: null,
  };
}

function buildInRaceRunner(): RankedRunnerDto {
  return {
    runner: {
      editionSlug: 'lepin-2026',
      slug: 'alice',
      displayName: 'Alice',
      photoKey: null,
      photoUrl: null,
      bib: 1,
    },
    rank: 1,
    status: { kind: 'in-race', lastLoop: 3 },
    lastLoopDurationMs: null,
    lastFinishedAt: null,
  };
}

function buildOutRunner(): RankedRunnerDto {
  return {
    runner: {
      editionSlug: 'lepin-2026',
      slug: 'bob',
      displayName: 'Bob',
      photoKey: null,
      photoUrl: null,
      bib: 2,
    },
    rank: 'ex-aequo',
    status: { kind: 'dnf', outAtLoop: 2, reason: 'late' },
    lastLoopDurationMs: null,
    lastFinishedAt: null,
  };
}

// @FollowsBlueprint test-pure-unit
describe('nextStep — self-punch FSM', () => {
  it('open(in-race runner) → confirm', () => {
    const next = nextStep(initialSelfPunchState, { type: 'open', runner: buildInRaceRunner() });
    expect(next).toEqual<SelfPunchState>({ kind: 'confirm' });
  });

  it('opening for a runner already out goes straight to the already out screen', () => {
    const next = nextStep(initialSelfPunchState, { type: 'open', runner: buildOutRunner() });
    expect(next).toEqual<SelfPunchState>({ kind: 'already-out' });
  });

  it('confirm-tap → awaiting-geo', () => {
    const next = nextStep({ kind: 'confirm' }, { type: 'confirm-tap' });
    expect(next).toEqual<SelfPunchState>({ kind: 'awaiting-geo' });
  });

  it('geo-out-of-zone carries the measured distance', () => {
    const next = nextStep(
      { kind: 'awaiting-geo' },
      { type: 'geo-out-of-zone', distanceMeters: 245 },
    );
    expect(next).toEqual<SelfPunchState>({ kind: 'out-of-zone', distanceMeters: 245 });
  });

  it('geo-denied → permission-denied', () => {
    expect(nextStep({ kind: 'awaiting-geo' }, { type: 'geo-denied' })).toEqual<SelfPunchState>({
      kind: 'permission-denied',
    });
  });

  it('geo-unavailable also maps to permission-denied (same UX guidance)', () => {
    expect(nextStep({ kind: 'awaiting-geo' }, { type: 'geo-unavailable' })).toEqual<SelfPunchState>(
      {
        kind: 'permission-denied',
      },
    );
  });

  it('geo-timeout → timeout', () => {
    expect(nextStep({ kind: 'awaiting-geo' }, { type: 'geo-timeout' })).toEqual<SelfPunchState>({
      kind: 'timeout',
    });
  });

  it('server-success carries the loopIndex', () => {
    expect(
      nextStep({ kind: 'awaiting-geo' }, { type: 'server-success', loopIndex: 3 }),
    ).toEqual<SelfPunchState>({ kind: 'success', validatedLoopIndex: 3 });
  });

  it("server-out-of-zone → out-of-zone (no distance field — the server didn't echo it)", () => {
    expect(
      nextStep({ kind: 'awaiting-geo' }, { type: 'server-out-of-zone' }),
    ).toEqual<SelfPunchState>({
      kind: 'out-of-zone',
    });
  });

  it('server-business-error carries the rejection reason', () => {
    const next = nextStep(
      { kind: 'awaiting-geo' },
      { type: 'server-business-error', reason: 'already-punched-this-loop' },
    );
    expect(next).toEqual<SelfPunchState>({
      kind: 'business-error',
      businessReason: 'already-punched-this-loop',
    });
  });

  it('network-error → network-error', () => {
    expect(nextStep({ kind: 'awaiting-geo' }, { type: 'network-error' })).toEqual<SelfPunchState>({
      kind: 'network-error',
    });
  });

  it('retry resets to the initial confirm state', () => {
    expect(nextStep({ kind: 'timeout' }, { type: 'retry' })).toEqual(initialSelfPunchState);
  });

  it('exposes the initial state as a constant', () => {
    expect(initialSelfPunchState).toEqual<SelfPunchState>({ kind: 'confirm' });
  });

  it('throws on an unknown event type (assertNever guard rail)', () => {
    // The runtime guard fires only when something delivers an unknown event
    // shape — by construction TypeScript prevents that at compile time.
    // Reach the branch by routing the `unknown` value through `Function.call`,
    // which sidesteps the parameter type without a type assertion.
    const malformed: unknown = { type: 'not-a-real-event' };
    expect(() => {
      Function.prototype.call.call(nextStep, null, initialSelfPunchState, malformed);
    }).toThrow(/unhandled self-punch event/);
  });
});

describe('selectTargetLoopIndex', () => {
  it('targets the loop after the last one a running runner closed', () => {
    expect(selectTargetLoopIndex(buildRunner({ kind: 'in-race', lastLoop: 3 }))).toBe(4);
  });

  it('targets the first loop for a runner with no closed loop', () => {
    expect(selectTargetLoopIndex(buildRunner({ kind: 'in-race', lastLoop: 0 }))).toBe(1);
  });

  it('targets the first loop for a runner who is out', () => {
    expect(selectTargetLoopIndex(buildRunner({ kind: 'dnf', outAtLoop: 2, reason: 'late' }))).toBe(
      1,
    );
  });
});

describe('readValidatedLoopIndex', () => {
  it('returns zero for a body that is not an object', () => {
    expect(readValidatedLoopIndex('nope')).toBe(0);
  });

  it('returns zero for a null body', () => {
    expect(readValidatedLoopIndex(null)).toBe(0);
  });

  it('returns zero for a body with no punch', () => {
    expect(readValidatedLoopIndex({})).toBe(0);
  });

  it('returns zero for a punch that is not an object', () => {
    expect(readValidatedLoopIndex({ punch: 'nope' })).toBe(0);
  });

  it('returns zero for a punch whose loop index is not a number', () => {
    expect(readValidatedLoopIndex({ punch: { loopIndex: '3' } })).toBe(0);
  });

  it('returns the loop index the server confirmed', () => {
    expect(readValidatedLoopIndex({ punch: { loopIndex: 3 } })).toBe(3);
  });
});

describe('selectRejectionEvent', () => {
  it('reads an out of zone refusal', () => {
    expect(selectRejectionEvent({ error: 'out-of-zone' })).toEqual({ type: 'server-out-of-zone' });
  });

  it('reads a named business refusal', () => {
    expect(selectRejectionEvent({ error: 'race-finished' })).toEqual({
      type: 'server-business-error',
      reason: 'race-finished',
    });
  });

  it('falls back to the not registered reason for an unnamed refusal', () => {
    expect(selectRejectionEvent({ error: 'mystery' })).toEqual({
      type: 'server-business-error',
      reason: 'runner-not-in-race',
    });
  });

  it('falls back to the not registered reason for a body that is not an object', () => {
    expect(selectRejectionEvent(null)).toEqual({
      type: 'server-business-error',
      reason: 'runner-not-in-race',
    });
  });
});

describe('selectFailureEvent', () => {
  it('treats anything that is not an API error as a lost connection', () => {
    expect(selectFailureEvent(new Error('offline'))).toEqual({ type: 'network-error' });
  });

  it('reads the refusal out of an API error', () => {
    expect(selectFailureEvent(new ApiError(409, { error: 'already-punched-this-loop' }))).toEqual({
      type: 'server-business-error',
      reason: 'already-punched-this-loop',
    });
  });
});
