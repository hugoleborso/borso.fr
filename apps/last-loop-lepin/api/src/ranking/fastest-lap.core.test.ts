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

function buildPunch(
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

// @FollowsBlueprint test-pure-unit
describe('fastestLap', () => {
  it('returns [] when no punches are recorded', () => {
    expect(fastestLap(EDITION, [])).toEqual([]);
  });

  it('returns [] when every punch is voided', () => {
    const punches = [
      buildPunch('alice', 1, '2026-09-19T06:45:00+02:00', '2026-09-19T06:50:00+02:00'),
      buildPunch('bob', 1, '2026-09-19T06:50:00+02:00', '2026-09-19T06:55:00+02:00'),
    ];
    expect(fastestLap(EDITION, punches)).toEqual([]);
  });

  it('surfaces the only runner when a single runner has a single loop', () => {
    const punches = [buildPunch('alice', 1, '2026-09-19T06:42:00+02:00')];
    const fastest = fastestLap(EDITION, punches);
    expect(fastest).toEqual([{ runnerSlug: 'alice', durationMs: 42 * 60_000 }]);
  });

  it('picks the runner with the smallest duration across multiple runners and loops', () => {
    const punches = [
      buildPunch('alice', 1, '2026-09-19T06:47:00+02:00'),
      buildPunch('alice', 2, '2026-09-19T07:44:00+02:00'),
      buildPunch('bob', 1, '2026-09-19T06:42:00+02:00'),
      buildPunch('bob', 2, '2026-09-19T07:48:00+02:00'),
      buildPunch('carla', 1, '2026-09-19T06:51:00+02:00'),
    ];
    const fastest = fastestLap(EDITION, punches);
    expect(fastest).toEqual([{ runnerSlug: 'bob', durationMs: 42 * 60_000 }]);
  });

  it('returns both runners (length 2) when two distinct runners tie at the millisecond', () => {
    const punches = [
      buildPunch('alice', 1, '2026-09-19T06:42:00.000+02:00'),
      buildPunch('bob', 1, '2026-09-19T06:42:00.000+02:00'),
      buildPunch('carla', 1, '2026-09-19T06:55:00.000+02:00'),
    ];
    const fastest = fastestLap(EDITION, punches);
    expect(fastest).toHaveLength(2);
    expect(fastest.map((entry) => entry.runnerSlug).sort()).toEqual(['alice', 'bob']);
    expect(fastest.every((entry) => entry.durationMs === 42 * 60_000)).toBe(true);
  });

  it('dedupes by runnerSlug when one runner has multiple punches at the same minimum', () => {
    const punches = [
      buildPunch('alice', 1, '2026-09-19T06:42:00+02:00'),
      buildPunch('alice', 2, '2026-09-19T07:42:00+02:00'),
      buildPunch('bob', 1, '2026-09-19T06:55:00+02:00'),
    ];
    const fastest = fastestLap(EDITION, punches);
    expect(fastest).toEqual([{ runnerSlug: 'alice', durationMs: 42 * 60_000 }]);
  });

  it('keeps the record on a runner who stopped punching, since it reads punches only', () => {
    const punches = [
      buildPunch('borso', 1, '2026-09-19T06:40:00+02:00'),
      buildPunch('hugo', 1, '2026-09-19T06:44:00+02:00'),
      buildPunch('hugo', 2, '2026-09-19T07:44:00+02:00'),
    ];
    const fastest = fastestLap(EDITION, punches);
    expect(fastest).toEqual([{ runnerSlug: 'borso', durationMs: 40 * 60_000 }]);
  });

  it('returns [] when every punch yields a null duration (clock-skew degenerate)', () => {
    const punches = [
      buildPunch('alice', 1, '2026-09-19T05:30:00+02:00'),
      buildPunch('bob', 1, '2026-09-19T05:45:00+02:00'),
    ];
    expect(fastestLap(EDITION, punches)).toEqual([]);
  });

  it('skips null-duration punches and still crowns the fastest real one', () => {
    const punches = [
      buildPunch('alice', 1, '2026-09-19T05:30:00+02:00'),
      buildPunch('bob', 1, '2026-09-19T06:42:00+02:00'),
    ];
    expect(fastestLap(EDITION, punches)).toEqual([{ runnerSlug: 'bob', durationMs: 42 * 60_000 }]);
  });

  it('is order-independent — passing punches in arbitrary order yields the same record', () => {
    const sorted = [
      buildPunch('alice', 1, '2026-09-19T06:47:00+02:00'),
      buildPunch('bob', 1, '2026-09-19T06:42:00+02:00'),
      buildPunch('alice', 2, '2026-09-19T07:44:00+02:00'),
    ];
    const shuffled = [sorted[2], sorted[0], sorted[1]].filter(
      (punch): punch is LoopPunch => punch !== undefined,
    );
    expect(fastestLap(EDITION, shuffled)).toEqual(fastestLap(EDITION, sorted));
  });
});
