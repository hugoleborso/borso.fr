import { describe, expect, it } from 'vitest';
import type { RaceEdition } from '../edition/edition.types';
import type { LoopPunch } from '../punch/punch.types';
import { fastestLap } from './fastest-lap.core';

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

function makePunch(
  runnerSlug: string,
  loopIndex: number,
  finishedAtIso: string,
  voidedAtIso: string | null = null,
): LoopPunch {
  return {
    id: `${runnerSlug}-${loopIndex}`,
    editionSlug: 'lepin-2026',
    runnerSlug,
    loopIndex,
    finishedAt: new Date(finishedAtIso),
    correctedAt: null,
    voidedAt: voidedAtIso === null ? null : new Date(voidedAtIso),
    source: 'admin',
    clientLat: null,
    clientLng: null,
    clientAccuracyM: null,
    distanceFromCenterM: null,
    userAgent: null,
  };
}

describe('fastestLap', () => {
  it('returns [] when no punches are recorded', () => {
    expect(fastestLap(EDITION, [])).toEqual([]);
  });

  it('returns [] when every punch is voided', () => {
    const punches = [
      makePunch('alice', 1, '2026-09-19T06:45:00+02:00', '2026-09-19T06:50:00+02:00'),
      makePunch('bob', 1, '2026-09-19T06:50:00+02:00', '2026-09-19T06:55:00+02:00'),
    ];
    expect(fastestLap(EDITION, punches)).toEqual([]);
  });

  it('surfaces the only runner when a single runner has a single loop', () => {
    const punches = [makePunch('alice', 1, '2026-09-19T06:42:00+02:00')];
    const result = fastestLap(EDITION, punches);
    expect(result).toEqual([{ runnerSlug: 'alice', durationMs: 42 * 60_000 }]);
  });

  it('picks the runner with the smallest duration across multiple runners and loops', () => {
    // Alice: loop 1 = 47 min, loop 2 = 44 min.
    // Bob:   loop 1 = 42 min, loop 2 = 48 min  → Bob holds 42 min.
    // Carla: loop 1 = 51 min.
    const punches = [
      makePunch('alice', 1, '2026-09-19T06:47:00+02:00'),
      makePunch('alice', 2, '2026-09-19T07:44:00+02:00'),
      makePunch('bob', 1, '2026-09-19T06:42:00+02:00'),
      makePunch('bob', 2, '2026-09-19T07:48:00+02:00'),
      makePunch('carla', 1, '2026-09-19T06:51:00+02:00'),
    ];
    const result = fastestLap(EDITION, punches);
    expect(result).toEqual([{ runnerSlug: 'bob', durationMs: 42 * 60_000 }]);
  });

  it('returns both runners (length 2) when two distinct runners tie at the millisecond', () => {
    const punches = [
      makePunch('alice', 1, '2026-09-19T06:42:00.000+02:00'),
      makePunch('bob', 1, '2026-09-19T06:42:00.000+02:00'),
      makePunch('carla', 1, '2026-09-19T06:55:00.000+02:00'),
    ];
    const result = fastestLap(EDITION, punches);
    expect(result).toHaveLength(2);
    expect(result.map((entry) => entry.runnerSlug).sort()).toEqual(['alice', 'bob']);
    expect(result.every((entry) => entry.durationMs === 42 * 60_000)).toBe(true);
  });

  it('dedupes by runnerSlug when one runner has multiple punches at the same minimum', () => {
    // Alice's loop 1 and loop 2 both clock 42 min — surface her once.
    const punches = [
      makePunch('alice', 1, '2026-09-19T06:42:00+02:00'),
      makePunch('alice', 2, '2026-09-19T07:42:00+02:00'),
      makePunch('bob', 1, '2026-09-19T06:55:00+02:00'),
    ];
    const result = fastestLap(EDITION, punches);
    expect(result).toEqual([{ runnerSlug: 'alice', durationMs: 42 * 60_000 }]);
  });

  it('keeps the record on a DNF holder (caller is responsible for filtering — we are not)', () => {
    // The "DNF" runner here is simply absent from later loops; their
    // earlier punch survives and remains the record. The projection
    // never consults ManualDnf — it operates on punches only.
    const punches = [
      makePunch('borso', 1, '2026-09-19T06:40:00+02:00'),
      makePunch('hugo', 1, '2026-09-19T06:44:00+02:00'),
      makePunch('hugo', 2, '2026-09-19T07:44:00+02:00'),
    ];
    const result = fastestLap(EDITION, punches);
    expect(result).toEqual([{ runnerSlug: 'borso', durationMs: 40 * 60_000 }]);
  });

  it('returns [] when every punch yields a null duration (clock-skew degenerate)', () => {
    // All punches precede the edition's startsAt → every duration is null.
    const punches = [
      makePunch('alice', 1, '2026-09-19T05:30:00+02:00'),
      makePunch('bob', 1, '2026-09-19T05:45:00+02:00'),
    ];
    expect(fastestLap(EDITION, punches)).toEqual([]);
  });

  it('is order-independent — passing punches in arbitrary order yields the same record', () => {
    const sorted = [
      makePunch('alice', 1, '2026-09-19T06:47:00+02:00'),
      makePunch('bob', 1, '2026-09-19T06:42:00+02:00'),
      makePunch('alice', 2, '2026-09-19T07:44:00+02:00'),
    ];
    const shuffled = [sorted[2], sorted[0], sorted[1]].filter(
      (punch): punch is LoopPunch => punch !== undefined,
    );
    expect(fastestLap(EDITION, shuffled)).toEqual(fastestLap(EDITION, sorted));
  });
});
