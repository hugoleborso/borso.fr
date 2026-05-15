import { describe, expect, it } from 'vitest';
import type { RaceEdition } from '../edition/edition.types';
import { lastLoopDurationMs, validatePunchTiming } from './punch.core';
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

function makePunch(loopIndex: number, finishedAtIso: string): LoopPunch {
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

describe('validatePunchTiming', () => {
  it('rejects punches before the race starts', () => {
    const result = validatePunchTiming(EDITION, 'alice', [], new Date('2026-09-19T05:30:00+02:00'));
    expect(result).toEqual({ ok: false, reason: 'race-not-started' });
  });

  it('rejects punches after the race ends', () => {
    const result = validatePunchTiming(EDITION, 'alice', [], new Date('2026-09-19T22:30:00+02:00'));
    expect(result).toEqual({ ok: false, reason: 'race-finished' });
  });

  it('accepts a fresh punch in loop 1', () => {
    const result = validatePunchTiming(EDITION, 'alice', [], new Date('2026-09-19T06:55:00+02:00'));
    expect(result).toEqual({ ok: true, loopIndex: 1 });
  });

  it('accepts a punch in loop 2 (after the first top)', () => {
    const result = validatePunchTiming(EDITION, 'alice', [], new Date('2026-09-19T07:30:00+02:00'));
    expect(result).toEqual({ ok: true, loopIndex: 2 });
  });

  it('rejects a second punch for the same loop', () => {
    const existing = [makePunch(1, '2026-09-19T06:55:00+02:00')];
    const result = validatePunchTiming(
      EDITION,
      'alice',
      existing,
      new Date('2026-09-19T06:58:00+02:00'),
    );
    expect(result).toEqual({ ok: false, reason: 'already-punched-this-loop' });
  });

  it('does not consider another runner’s punch as a conflict', () => {
    const existing: readonly LoopPunch[] = [
      { ...makePunch(1, '2026-09-19T06:55:00+02:00'), runnerSlug: 'bob' },
    ];
    const result = validatePunchTiming(
      EDITION,
      'alice',
      existing,
      new Date('2026-09-19T06:58:00+02:00'),
    );
    expect(result).toEqual({ ok: true, loopIndex: 1 });
  });

  it('treats now === startsAt as the start of loop 1', () => {
    const result = validatePunchTiming(EDITION, 'alice', [], EDITION.startsAt);
    expect(result).toEqual({ ok: true, loopIndex: 1 });
  });

  it('treats now === endsAt as still in-race (cutoff is strict-after)', () => {
    const result = validatePunchTiming(EDITION, 'alice', [], EDITION.endsAt);
    expect(result.ok).toBe(true);
  });
});

describe('lastLoopDurationMs', () => {
  it('returns null when the runner has no punches', () => {
    expect(lastLoopDurationMs(EDITION, 'alice', [])).toBeNull();
  });

  it('returns elapsed time since startsAt for the first loop', () => {
    const punch = makePunch(1, '2026-09-19T06:48:30+02:00');
    expect(lastLoopDurationMs(EDITION, 'alice', [punch])).toBe(48.5 * 60_000);
  });

  it('returns null when the only punch precedes startsAt', () => {
    const punch = makePunch(1, '2026-09-19T05:30:00+02:00');
    expect(lastLoopDurationMs(EDITION, 'alice', [punch])).toBeNull();
  });

  it("uses the loop's top-of-hour boundary as the start, not the previous punch", () => {
    // Loop 1 closed at 06:48:30 (the punch). Loop 2 starts at 07:00 (top of
    // the hour) regardless of when the runner arrived back at the corral.
    // Loop 2 punch at 07:51:15 → 51 min 15 s of actual running, not the
    // 1h02m45s wall-clock gap between the two punches.
    const punches = [
      makePunch(1, '2026-09-19T06:48:30+02:00'),
      makePunch(2, '2026-09-19T07:51:15+02:00'),
    ];
    expect(lastLoopDurationMs(EDITION, 'alice', punches)).toBe(51 * 60_000 + 15_000);
  });

  it('ignores punches from other runners', () => {
    const punches: readonly LoopPunch[] = [
      makePunch(1, '2026-09-19T06:48:30+02:00'),
      { ...makePunch(2, '2026-09-19T07:50:00+02:00'), runnerSlug: 'bob' },
    ];
    expect(lastLoopDurationMs(EDITION, 'alice', punches)).toBe(48.5 * 60_000);
  });

  it('uses the punch loopIndex (not array length) to find the top-of-hour boundary', () => {
    // A runner who skipped loop 1 and only punched loop 2 has their loop
    // time measured from 07:00, not 06:00 — the boundary is keyed on the
    // recorded loopIndex.
    const punches = [makePunch(2, '2026-09-19T07:48:30+02:00')];
    expect(lastLoopDurationMs(EDITION, 'alice', punches)).toBe(48.5 * 60_000);
  });
});
