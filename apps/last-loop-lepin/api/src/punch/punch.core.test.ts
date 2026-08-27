import { describe, expect, it } from 'vitest';
import type { RaceEdition } from '../edition/edition.types';
import { lastLoopDurationMs, loopDurationMs, validatePunchTiming } from './punch.core';
import type { LoopPunch } from './punch.types';

const EDITION: RaceEdition = {
  slug: 'lepin-2026',
  displayName: '2026',
  startsAt: new Date('2026-09-19T06:00:00+02:00'),
  endsAt: new Date('2026-09-19T22:00:00+02:00'),
  sunriseAt: new Date('2026-09-19T07:15:00+02:00'),
  sunsetAt: new Date('2026-09-19T19:45:00+02:00'),
  intervalMinutes: 60,
  gpx: {
    distanceMeters: 5800,
    elevationGainMeters: 250,
    trackJson: { points: [{ lat: 45.55, lng: 5.78 }] },
    startLatLng: { lat: 45.55, lng: 5.78 },
  },
  status: 'live',
};

function buildPunch(loopIndex: number, finishedAtIso: string): LoopPunch {
  return {
    id: `alice-${loopIndex}`,
    editionSlug: 'lepin-2026',
    runnerSlug: 'alice',
    loopIndex,
    finishedAt: new Date(finishedAtIso),
    correctedAt: null,
    voidedAt: null,
    source: 'admin',
    clientLat: null,
    clientLng: null,
    clientAccuracyM: null,
    distanceFromCenterM: null,
    userAgent: null,
  };
}

// @FollowsBlueprint test-pure-unit
describe('validatePunchTiming', () => {
  it('rejects punches before the race starts', () => {
    const verdict = validatePunchTiming({
      edition: EDITION,
      runnerSlug: 'alice',
      validPunchesForRunner: [],
      now: new Date('2026-09-19T05:30:00+02:00'),
    });
    expect(verdict).toEqual({ ok: false, reason: 'race-not-started' });
  });

  it('rejects punches after the race ends', () => {
    const verdict = validatePunchTiming({
      edition: EDITION,
      runnerSlug: 'alice',
      validPunchesForRunner: [],
      now: new Date('2026-09-19T22:30:00+02:00'),
    });
    expect(verdict).toEqual({ ok: false, reason: 'race-finished' });
  });

  it('accepts a fresh punch in loop 1', () => {
    const verdict = validatePunchTiming({
      edition: EDITION,
      runnerSlug: 'alice',
      validPunchesForRunner: [],
      now: new Date('2026-09-19T06:55:00+02:00'),
    });
    expect(verdict).toEqual({ ok: true, loopIndex: 1 });
  });

  it('accepts a punch in loop 2 (after the first top)', () => {
    const verdict = validatePunchTiming({
      edition: EDITION,
      runnerSlug: 'alice',
      validPunchesForRunner: [],
      now: new Date('2026-09-19T07:30:00+02:00'),
    });
    expect(verdict).toEqual({ ok: true, loopIndex: 2 });
  });

  it('rejects a second punch for the same loop', () => {
    const existing = [buildPunch(1, '2026-09-19T06:55:00+02:00')];
    const verdict = validatePunchTiming({
      edition: EDITION,
      runnerSlug: 'alice',
      validPunchesForRunner: existing,
      now: new Date('2026-09-19T06:58:00+02:00'),
    });
    expect(verdict).toEqual({ ok: false, reason: 'already-punched-this-loop' });
  });

  it('does not consider the runner’s punch for an earlier loop as a conflict', () => {
    const existing: readonly LoopPunch[] = [buildPunch(1, '2026-09-19T06:55:00+02:00')];
    const verdict = validatePunchTiming({
      edition: EDITION,
      runnerSlug: 'alice',
      validPunchesForRunner: existing,
      now: new Date('2026-09-19T07:55:00+02:00'),
    });
    expect(verdict).toEqual({ ok: true, loopIndex: 2 });
  });

  it('does not consider another runner’s punch as a conflict', () => {
    const existing: readonly LoopPunch[] = [
      { ...buildPunch(1, '2026-09-19T06:55:00+02:00'), runnerSlug: 'bob' },
    ];
    const verdict = validatePunchTiming({
      edition: EDITION,
      runnerSlug: 'alice',
      validPunchesForRunner: existing,
      now: new Date('2026-09-19T06:58:00+02:00'),
    });
    expect(verdict).toEqual({ ok: true, loopIndex: 1 });
  });

  it('treats now === startsAt as the start of loop 1', () => {
    const verdict = validatePunchTiming({
      edition: EDITION,
      runnerSlug: 'alice',
      validPunchesForRunner: [],
      now: EDITION.startsAt,
    });
    expect(verdict).toEqual({ ok: true, loopIndex: 1 });
  });

  it('treats now === endsAt as still in-race (cutoff is strict-after)', () => {
    const verdict = validatePunchTiming({
      edition: EDITION,
      runnerSlug: 'alice',
      validPunchesForRunner: [],
      now: EDITION.endsAt,
    });
    expect(verdict.ok).toBe(true);
  });
});

// @FollowsBlueprint test-pure-unit
describe('lastLoopDurationMs', () => {
  it('returns null when the runner has no punches', () => {
    expect(lastLoopDurationMs(EDITION, 'alice', [])).toBeNull();
  });

  it('returns elapsed time since startsAt for the first loop', () => {
    const punch = buildPunch(1, '2026-09-19T06:48:30+02:00');
    expect(lastLoopDurationMs(EDITION, 'alice', [punch])).toBe(48.5 * 60_000);
  });

  it('returns null when the only punch precedes startsAt', () => {
    const punch = buildPunch(1, '2026-09-19T05:30:00+02:00');
    expect(lastLoopDurationMs(EDITION, 'alice', [punch])).toBeNull();
  });

  it('measures the loop from its own hourly top, not from the previous punch', () => {
    const punches = [
      buildPunch(1, '2026-09-19T06:48:30+02:00'),
      buildPunch(2, '2026-09-19T07:51:15+02:00'),
    ];
    const runningTimeSinceTheSevenOclockTopMs = 51 * 60_000 + 15_000;
    const wallClockGapBetweenTheTwoPunchesMs = 62 * 60_000 + 45_000;

    expect(lastLoopDurationMs(EDITION, 'alice', punches)).toBe(runningTimeSinceTheSevenOclockTopMs);
    expect(lastLoopDurationMs(EDITION, 'alice', punches)).not.toBe(
      wallClockGapBetweenTheTwoPunchesMs,
    );
  });

  it('reads the deepest loop, not the last element, when punches arrive out of order', () => {
    const punches = [
      buildPunch(2, '2026-09-19T07:51:15+02:00'),
      buildPunch(1, '2026-09-19T06:48:30+02:00'),
    ];
    expect(lastLoopDurationMs(EDITION, 'alice', punches)).toBe(51 * 60_000 + 15_000);
  });

  it('ignores punches from other runners', () => {
    const punches: readonly LoopPunch[] = [
      buildPunch(1, '2026-09-19T06:48:30+02:00'),
      { ...buildPunch(2, '2026-09-19T07:50:00+02:00'), runnerSlug: 'bob' },
    ];
    expect(lastLoopDurationMs(EDITION, 'alice', punches)).toBe(48.5 * 60_000);
  });

  it('keys the hourly top on the recorded loopIndex, not on how many punches there are', () => {
    const punchesFromARunnerWhoSkippedLoopOne = [buildPunch(2, '2026-09-19T07:48:30+02:00')];
    expect(lastLoopDurationMs(EDITION, 'alice', punchesFromARunnerWhoSkippedLoopOne)).toBe(
      48.5 * 60_000,
    );
  });
});

// @FollowsBlueprint test-pure-unit
describe('loopDurationMs', () => {
  it('returns the elapsed time from the loop boundary to finishedAt', () => {
    const punch = buildPunch(1, '2026-09-19T06:48:30+02:00');
    expect(loopDurationMs(EDITION, punch)).toBe(48.5 * 60_000);
  });

  it('returns null when finishedAt precedes the loop boundary (clock skew)', () => {
    const punch = buildPunch(1, '2026-09-19T05:30:00+02:00');
    expect(loopDurationMs(EDITION, punch)).toBeNull();
  });

  it('returns 0 when finishedAt equals the loop boundary exactly', () => {
    const punch = buildPunch(1, '2026-09-19T06:00:00+02:00');
    expect(loopDurationMs(EDITION, punch)).toBe(0);
  });
});
