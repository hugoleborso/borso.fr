import { describe, expect, it } from 'vitest';
import type { LoopPunch, ManualDidNotFinish } from '../punch/punch.types';
import type { Runner } from '../runner/runner.types';
import {
  isRaceEndReached,
  loopIndexAt,
  nextHourlyTop,
  projectDidNotFinishCandidates,
  totalHourlyTops,
} from './edition.core';
import type { RaceEdition } from './edition.types';

const EDITION_2026: RaceEdition = {
  slug: 'lepin-2026',
  displayName: 'Last Loop Lépin 2026',
  startsAt: new Date('2026-09-19T06:00:00+02:00'),
  endsAt: new Date('2026-09-19T22:00:00+02:00'),
  sunriseAt: new Date('2026-09-19T07:15:00+02:00'),
  sunsetAt: new Date('2026-09-19T19:45:00+02:00'),
  intervalMinutes: 60,
  gpx: {
    distanceMeters: 5_800,
    elevationGainMeters: 250,
    trackJson: { points: [{ lat: 45.55, lng: 5.78 }] },
    startLatLng: { lat: 45.55, lng: 5.78 },
  },
  status: 'live',
};

const RUNNERS: readonly Runner[] = [
  { editionSlug: 'lepin-2026', slug: 'alice', displayName: 'Alice', photoKey: null, bib: 1 },
  { editionSlug: 'lepin-2026', slug: 'bob', displayName: 'Bob', photoKey: null, bib: 2 },
  { editionSlug: 'lepin-2026', slug: 'carla', displayName: 'Carla', photoKey: null, bib: 3 },
];

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
describe('nextHourlyTop', () => {
  it('returns startsAt when now is before the race begins', () => {
    const before = new Date('2026-09-19T05:30:00+02:00');
    expect(nextHourlyTop(EDITION_2026, before)).toEqual(EDITION_2026.startsAt);
  });

  it('returns startsAt when now is more than one interval before the race begins', () => {
    const wellBefore = new Date('2026-09-19T03:30:00+02:00');
    expect(nextHourlyTop(EDITION_2026, wellBefore)).toEqual(EDITION_2026.startsAt);
  });

  it('returns the first boundary after startsAt when now lands exactly on startsAt', () => {
    expect(nextHourlyTop(EDITION_2026, EDITION_2026.startsAt)).toEqual(
      new Date('2026-09-19T07:00:00+02:00'),
    );
  });

  it('returns the next hourly boundary mid-race', () => {
    const midLoop3 = new Date('2026-09-19T08:35:00+02:00');
    expect(nextHourlyTop(EDITION_2026, midLoop3)).toEqual(new Date('2026-09-19T09:00:00+02:00'));
  });

  it('returns null when the next boundary lands exactly on endsAt', () => {
    const insideTheLastLoop = new Date('2026-09-19T21:30:00+02:00');
    expect(nextHourlyTop(EDITION_2026, insideTheLastLoop)).toBeNull();
  });

  it('returns null after endsAt', () => {
    const afterEnd = new Date('2026-09-19T22:30:00+02:00');
    expect(nextHourlyTop(EDITION_2026, afterEnd)).toBeNull();
  });

  it('returns null when the next boundary would land after endsAt', () => {
    const closeToEnd = new Date('2026-09-19T21:55:00+02:00');
    expect(nextHourlyTop(EDITION_2026, closeToEnd)).toBeNull();
  });

  it('returns the boundary itself when now lies exactly on it', () => {
    const onBoundary = new Date('2026-09-19T07:00:00+02:00');
    expect(nextHourlyTop(EDITION_2026, onBoundary)).toEqual(new Date('2026-09-19T08:00:00+02:00'));
  });
});

// @FollowsBlueprint test-pure-unit
describe('loopIndexAt', () => {
  it('is 0 before startsAt', () => {
    expect(loopIndexAt(EDITION_2026, new Date('2026-09-19T05:00:00+02:00'))).toBe(0);
  });

  it('is 0 exactly at startsAt', () => {
    expect(loopIndexAt(EDITION_2026, EDITION_2026.startsAt)).toBe(0);
  });

  it('is 1 during the first hour after startsAt', () => {
    expect(loopIndexAt(EDITION_2026, new Date('2026-09-19T06:45:00+02:00'))).toBe(1);
  });

  it('is 4 at 09:30', () => {
    expect(loopIndexAt(EDITION_2026, new Date('2026-09-19T09:30:00+02:00'))).toBe(4);
  });

  it('continues counting beyond endsAt for diagnostic display', () => {
    expect(loopIndexAt(EDITION_2026, new Date('2026-09-19T23:00:00+02:00'))).toBe(18);
  });
});

// @FollowsBlueprint test-pure-unit
describe('isRaceEndReached', () => {
  it('false before endsAt', () => {
    expect(isRaceEndReached(EDITION_2026, new Date('2026-09-19T21:59:00+02:00'))).toBe(false);
  });

  it('true at endsAt', () => {
    expect(isRaceEndReached(EDITION_2026, EDITION_2026.endsAt)).toBe(true);
  });

  it('true after endsAt', () => {
    expect(isRaceEndReached(EDITION_2026, new Date('2026-09-20T00:00:00+02:00'))).toBe(true);
  });
});

// @FollowsBlueprint test-pure-unit
describe('projectDidNotFinishCandidates', () => {
  it('returns no candidates before the second top', () => {
    const now = new Date('2026-09-19T06:30:00+02:00');
    const candidates = projectDidNotFinishCandidates(EDITION_2026, RUNNERS, [], [], now);
    expect(candidates).toHaveLength(0);
  });

  it('flags runners with no closed-loop punch at the top of loop 2', () => {
    const now = new Date('2026-09-19T07:01:00+02:00');
    const punches: readonly LoopPunch[] = [buildPunch('alice', 1, '2026-09-19T06:55:00+02:00')];
    const candidates = projectDidNotFinishCandidates(EDITION_2026, RUNNERS, punches, [], now);
    const slugs = candidates.map((entry) => entry.runner.slug);
    expect(slugs).toEqual(['bob', 'carla']);
    expect(candidates[0]?.missedAfterLoop).toBe(1);
  });

  it('does not flag runners already marked DNF manually', () => {
    const now = new Date('2026-09-19T07:01:00+02:00');
    const punches: readonly LoopPunch[] = [buildPunch('alice', 1, '2026-09-19T06:55:00+02:00')];
    const manualDidNotFinishes: readonly ManualDidNotFinish[] = [
      {
        editionSlug: 'lepin-2026',
        runnerSlug: 'bob',
        outAtLoop: 1,
        reason: 'manual',
        decidedAt: new Date('2026-09-19T06:50:00+02:00'),
      },
    ];
    const candidates = projectDidNotFinishCandidates(
      EDITION_2026,
      RUNNERS,
      punches,
      manualDidNotFinishes,
      now,
    );
    expect(candidates.map((entry) => entry.runner.slug)).toEqual(['carla']);
  });

  it('ignores voided punches when projecting DNFs', () => {
    const now = new Date('2026-09-19T07:01:00+02:00');
    const punches: readonly LoopPunch[] = [
      buildPunch('alice', 1, '2026-09-19T06:55:00+02:00', '2026-09-19T07:00:00+02:00'),
    ];
    const candidates = projectDidNotFinishCandidates(EDITION_2026, RUNNERS, punches, [], now);
    expect(candidates.map((entry) => entry.runner.slug)).toEqual(['alice', 'bob', 'carla']);
  });

  it('does not let a punch for another loop stand in for the one that just closed', () => {
    // Alice punched loop 2 early — from the future, as far as the loop-1
    // deadline is concerned. It must not clear her of loop 1.
    const now = new Date('2026-09-19T07:01:00+02:00');
    const punches: readonly LoopPunch[] = [buildPunch('alice', 2, '2026-09-19T06:40:00+02:00')];
    const candidates = projectDidNotFinishCandidates(EDITION_2026, RUNNERS, punches, [], now);
    expect(candidates.map((entry) => entry.runner.slug)).toEqual(['alice', 'bob', 'carla']);
  });

  it('counts a punch landing exactly on the closing top', () => {
    const now = new Date('2026-09-19T07:01:00+02:00');
    const punches: readonly LoopPunch[] = [buildPunch('alice', 1, '2026-09-19T07:00:00+02:00')];
    const candidates = projectDidNotFinishCandidates(EDITION_2026, RUNNERS, punches, [], now);
    expect(candidates.map((entry) => entry.runner.slug)).toEqual(['bob', 'carla']);
  });

  it('treats a punch arriving within the tolerance window as valid', () => {
    const now = new Date('2026-09-19T07:01:00+02:00');
    const punches: readonly LoopPunch[] = [buildPunch('alice', 1, '2026-09-19T07:00:25+02:00')];
    const candidates = projectDidNotFinishCandidates(EDITION_2026, RUNNERS, punches, [], now);
    expect(candidates.map((entry) => entry.runner.slug)).toContain('alice');
  });
});

// @FollowsBlueprint test-pure-unit
describe('totalHourlyTops', () => {
  it('counts boundaries strictly inside the race window', () => {
    expect(totalHourlyTops(EDITION_2026)).toBe(16);
  });

  it('returns 0 for a degenerate edition with endsAt <= startsAt', () => {
    const degenerate: RaceEdition = {
      ...EDITION_2026,
      endsAt: EDITION_2026.startsAt,
    };
    expect(totalHourlyTops(degenerate)).toBe(0);
  });
});
