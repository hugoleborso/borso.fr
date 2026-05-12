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

  it('returns the gap between the last two punches when there are multiple', () => {
    const punches = [
      makePunch(1, '2026-09-19T06:48:30+02:00'),
      makePunch(2, '2026-09-19T07:51:15+02:00'),
    ];
    const expectedMs = new Date('2026-09-19T07:51:15+02:00').getTime() -
      new Date('2026-09-19T06:48:30+02:00').getTime();
    expect(lastLoopDurationMs(EDITION, 'alice', punches)).toBe(expectedMs);
  });

  it('ignores punches from other runners', () => {
    const punches: readonly LoopPunch[] = [
      makePunch(1, '2026-09-19T06:48:30+02:00'),
      { ...makePunch(2, '2026-09-19T07:50:00+02:00'), runnerSlug: 'bob' },
    ];
    expect(lastLoopDurationMs(EDITION, 'alice', punches)).toBe(48.5 * 60_000);
  });
});
