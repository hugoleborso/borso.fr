import { describe, expect, it } from 'vitest';
import type { RankedRunnerDto } from '../domain/types';
import { initialSelfPunchState, nextStep, type SelfPunchState } from './SelfPunchModal.utils';

function makeInRaceRunner(): RankedRunnerDto {
  return {
    runner: {
      editionSlug: 'lepin-2026',
      slug: 'alice',
      displayName: 'Alice',
      photoKey: null,
      bib: 1,
    },
    rank: 1,
    status: { kind: 'in-race', lastLoop: 3 },
    lastLoopDurationMs: null,
    lastFinishedAt: null,
  };
}

function makeDnfRunner(): RankedRunnerDto {
  return {
    runner: {
      editionSlug: 'lepin-2026',
      slug: 'bob',
      displayName: 'Bob',
      photoKey: null,
      bib: 2,
    },
    rank: 'ex-aequo',
    status: { kind: 'dnf', outAtLoop: 2, reason: 'late' },
    lastLoopDurationMs: null,
    lastFinishedAt: null,
  };
}

describe('nextStep — self-punch FSM', () => {
  it('open(in-race runner) → confirm', () => {
    const next = nextStep(initialSelfPunchState, { type: 'open', runner: makeInRaceRunner() });
    expect(next).toEqual<SelfPunchState>({ kind: 'confirm' });
  });

  it('open(dnf runner) → dnf (no geoloc, no API call)', () => {
    const next = nextStep(initialSelfPunchState, { type: 'open', runner: makeDnfRunner() });
    expect(next).toEqual<SelfPunchState>({ kind: 'dnf' });
  });

  it('confirm-tap → awaiting-geo', () => {
    const next = nextStep({ kind: 'confirm' }, { type: 'confirm-tap' });
    expect(next).toEqual<SelfPunchState>({ kind: 'awaiting-geo' });
  });

  it('geo-out-of-zone carries the measured distance', () => {
    const next = nextStep({ kind: 'awaiting-geo' }, { type: 'geo-out-of-zone', distanceMeters: 245 });
    expect(next).toEqual<SelfPunchState>({ kind: 'out-of-zone', distanceMeters: 245 });
  });

  it('geo-denied → permission-denied', () => {
    expect(nextStep({ kind: 'awaiting-geo' }, { type: 'geo-denied' })).toEqual<SelfPunchState>({
      kind: 'permission-denied',
    });
  });

  it('geo-unavailable also maps to permission-denied (same UX guidance)', () => {
    expect(nextStep({ kind: 'awaiting-geo' }, { type: 'geo-unavailable' })).toEqual<SelfPunchState>({
      kind: 'permission-denied',
    });
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

  it('server-out-of-zone → out-of-zone (no distance field — the server didn\'t echo it)', () => {
    expect(nextStep({ kind: 'awaiting-geo' }, { type: 'server-out-of-zone' })).toEqual<SelfPunchState>({
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
