import { describe, expect, it } from 'vitest';
import type { RaceEdition } from '../edition/edition.types';
import type { LoopPunch, ManualDnf } from '../punch/punch.types';
import type { Runner } from '../runner/runner.types';
import { computeStandings } from './ranking.core';

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

const RUNNERS: readonly Runner[] = [
  { editionSlug: 'lepin-2026', slug: 'alice', displayName: 'Alice', photoKey: null, bib: 1 },
  { editionSlug: 'lepin-2026', slug: 'bob', displayName: 'Bob', photoKey: null, bib: 2 },
  { editionSlug: 'lepin-2026', slug: 'carla', displayName: 'Carla', photoKey: null, bib: 3 },
];

function punch(
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

describe('computeStandings', () => {
  it('returns every runner in race before any punches', () => {
    const now = new Date('2026-09-19T06:30:00+02:00');
    const standings = computeStandings(EDITION, RUNNERS, [], [], now);
    expect(standings.ranked).toHaveLength(3);
    expect(standings.ranked.every((entry) => entry.status.kind === 'in-race')).toBe(true);
    expect(standings.raceEnded).toBe(false);
  });

  it('ranks deeper-loop runners higher mid-race', () => {
    const now = new Date('2026-09-19T08:30:00+02:00');
    const punches = [
      punch('alice', 1, '2026-09-19T06:55:00+02:00'),
      punch('alice', 2, '2026-09-19T07:55:00+02:00'),
      punch('bob', 1, '2026-09-19T06:58:00+02:00'),
      punch('carla', 1, '2026-09-19T06:59:00+02:00'),
      punch('carla', 2, '2026-09-19T07:58:00+02:00'),
    ];
    const standings = computeStandings(EDITION, RUNNERS, punches, [], now);
    expect(standings.ranked[0]?.runner.slug).toBe('alice');
    expect(standings.ranked[1]?.runner.slug).toBe('carla');
    expect(standings.ranked[2]?.runner.slug).toBe('bob');
  });

  it('tie-breaks identical loops by earliest finishing time', () => {
    const now = new Date('2026-09-19T07:30:00+02:00');
    const punches = [
      punch('alice', 1, '2026-09-19T06:55:30+02:00'),
      punch('bob', 1, '2026-09-19T06:55:00+02:00'),
    ];
    const standings = computeStandings(EDITION, RUNNERS, punches, [], now);
    expect(standings.ranked[0]?.runner.slug).toBe('bob');
    expect(standings.ranked[1]?.runner.slug).toBe('alice');
  });

  it('marks two runners ex-aequo on identical millisecond timestamps', () => {
    const now = new Date('2026-09-19T07:30:00+02:00');
    const punches = [
      punch('alice', 1, '2026-09-19T06:55:00.000+02:00'),
      punch('bob', 1, '2026-09-19T06:55:00.000+02:00'),
    ];
    const standings = computeStandings(EDITION, RUNNERS, punches, [], now);
    expect(standings.ranked[0]?.rank).toBe('ex-aequo');
    expect(standings.ranked[1]?.rank).toBe('ex-aequo');
  });

  it('puts late runners (DNF=late) after in-race ones, ranked by depth reached', () => {
    const now = new Date('2026-09-19T08:00:30+02:00');
    const punches = [
      punch('alice', 1, '2026-09-19T06:55:00+02:00'),
      punch('alice', 2, '2026-09-19T07:55:00+02:00'),
      punch('carla', 1, '2026-09-19T06:59:00+02:00'),
    ];
    const standings = computeStandings(EDITION, RUNNERS, punches, [], now);
    const lastIndex = standings.ranked.length - 1;
    expect(standings.ranked[0]?.runner.slug).toBe('alice');
    expect(standings.ranked[1]?.runner.slug).toBe('carla');
    expect(standings.ranked[2]?.runner.slug).toBe('bob');
    expect(standings.ranked[lastIndex]?.status.kind).toBe('dnf');
  });

  it('treats manual DNFs as DNF regardless of punch count', () => {
    const now = new Date('2026-09-19T08:30:00+02:00');
    const punches = [
      punch('alice', 1, '2026-09-19T06:55:00+02:00'),
      punch('alice', 2, '2026-09-19T07:55:00+02:00'),
    ];
    const manualDnfs: readonly ManualDnf[] = [
      {
        editionSlug: 'lepin-2026',
        runnerSlug: 'alice',
        outAtLoop: 2,
        reason: 'manual',
        decidedAt: new Date('2026-09-19T08:01:00+02:00'),
      },
    ];
    const standings = computeStandings(EDITION, RUNNERS, punches, manualDnfs, now);
    expect(standings.ranked.find((entry) => entry.runner.slug === 'alice')?.status.kind).toBe(
      'dnf',
    );
  });

  it('ignores voided punches', () => {
    const now = new Date('2026-09-19T07:30:00+02:00');
    const punches = [
      punch('alice', 1, '2026-09-19T06:55:00+02:00'),
      punch('bob', 1, '2026-09-19T06:55:00+02:00', '2026-09-19T07:00:00+02:00'),
    ];
    const standings = computeStandings(EDITION, RUNNERS, punches, [], now);
    expect(standings.ranked.find((entry) => entry.runner.slug === 'bob')?.status.kind).toBe('dnf');
    expect(standings.ranked[0]?.runner.slug).toBe('alice');
  });

  it('marks raceEnded true once now passes endsAt', () => {
    const now = new Date('2026-09-19T22:30:00+02:00');
    const standings = computeStandings(EDITION, RUNNERS, [], [], now);
    expect(standings.raceEnded).toBe(true);
  });

  it('marks raceEnded true when at most one runner is in-race', () => {
    const now = new Date('2026-09-19T08:30:00+02:00');
    const punches = [
      punch('alice', 1, '2026-09-19T06:55:00+02:00'),
      punch('alice', 2, '2026-09-19T07:55:00+02:00'),
    ];
    const standings = computeStandings(EDITION, RUNNERS, punches, [], now);
    expect(standings.raceEnded).toBe(true);
    expect(standings.ranked[0]?.runner.slug).toBe('alice');
    expect(standings.ranked[0]?.status.kind).toBe('in-race');
  });

  it('treats a punch with a missing intermediate loop as still in-race up to the gap', () => {
    const now = new Date('2026-09-19T08:30:00+02:00');
    const punches = [
      punch('alice', 1, '2026-09-19T06:55:00+02:00'),
      punch('alice', 3, '2026-09-19T08:55:00+02:00'),
    ];
    const standings = computeStandings(EDITION, RUNNERS, punches, [], now);
    const alice = standings.ranked.find((entry) => entry.runner.slug === 'alice');
    expect(alice?.status.kind).toBe('dnf');
  });

  it('reports a final ranking after endsAt — runners are ranked by depth and ex-aequo applied on equal last-loop time', () => {
    const now = new Date('2026-09-19T22:30:00+02:00');
    const punches = [
      punch('alice', 1, '2026-09-19T06:55:00+02:00'),
      punch('alice', 2, '2026-09-19T07:55:00+02:00'),
      punch('bob', 1, '2026-09-19T06:58:00+02:00'),
      punch('bob', 2, '2026-09-19T07:55:00+02:00'),
    ];
    const standings = computeStandings(EDITION, RUNNERS, punches, [], now);
    expect(standings.raceEnded).toBe(true);
    expect(standings.ranked[0]?.rank).toBe('ex-aequo');
  });

  it('attaches lastLoopDurationMs and lastFinishedAt for in-race runners', () => {
    // Loop 2 starts at 07:00 (top of the hour, EDITION starts 06:00).
    // Alice punches it at 07:55 → 55 min of actual running, not 60.
    // The hour gap between punches 1 and 2 includes corral rest, which
    // doesn't count toward the loop time.
    const now = new Date('2026-09-19T08:30:00+02:00');
    const punches = [
      punch('alice', 1, '2026-09-19T06:55:00+02:00'),
      punch('alice', 2, '2026-09-19T07:55:00+02:00'),
    ];
    const standings = computeStandings(EDITION, RUNNERS, punches, [], now);
    const alice = standings.ranked.find((entry) => entry.runner.slug === 'alice');
    expect(alice?.lastLoopDurationMs).toBe(55 * 60_000);
    expect(alice?.lastFinishedAt).toEqual(new Date('2026-09-19T07:55:00+02:00'));
  });

  it('computedAt mirrors the now argument', () => {
    const now = new Date('2026-09-19T08:30:00+02:00');
    const standings = computeStandings(EDITION, RUNNERS, [], [], now);
    expect(standings.computedAt).toEqual(now);
  });

  it('returns an empty fastestLap before any punch is recorded', () => {
    const now = new Date('2026-09-19T06:30:00+02:00');
    const standings = computeStandings(EDITION, RUNNERS, [], [], now);
    expect(standings.fastestLap).toEqual([]);
  });

  it('keeps full-distance finishers in-race when standings are recomputed long after endsAt', () => {
    // The race is 16 loops (06:00 → 22:00, 60-min interval). Two days
    // after `endsAt`, `loopIndexAt` would naively report ~64; without
    // capping the expected closed loop at `totalHourlyTops`, every
    // finisher would flip to DNF "late" the day after the race. This is
    // the regression that hid the four real finishers behind a wall of
    // `dnf outAtLoop=15` on the archived 3L 2026 standings.
    const now = new Date('2026-09-21T22:30:00+02:00');
    const punches = Array.from({ length: 16 }, (_, index) =>
      // Finish 5 min before each top-of-hour — same shape as a real run.
      punch('alice', index + 1, `2026-09-19T${String(6 + index).padStart(2, '0')}:55:00+02:00`),
    );
    const standings = computeStandings(EDITION, RUNNERS, punches, [], now);
    const alice = standings.ranked.find((entry) => entry.runner.slug === 'alice');
    expect(alice?.status).toEqual({ kind: 'in-race', lastLoop: 16 });
    expect(standings.raceEnded).toBe(true);
  });

  it('keeps the DNF reason and outAtLoop honest for runners who stopped before the end, regardless of how long ago endsAt was', () => {
    const now = new Date('2026-09-21T22:30:00+02:00');
    // Bob completed loops 1..10 then stopped — outAtLoop should report
    // his actual last-completed loop, not whatever bogus expectedClosedLoop
    // the uncapped formula would have produced.
    const punches = Array.from({ length: 10 }, (_, index) =>
      punch('bob', index + 1, `2026-09-19T${String(6 + index).padStart(2, '0')}:55:00+02:00`),
    );
    const standings = computeStandings(EDITION, RUNNERS, punches, [], now);
    const bob = standings.ranked.find((entry) => entry.runner.slug === 'bob');
    expect(bob?.status).toEqual({ kind: 'dnf', outAtLoop: 10, reason: 'late' });
  });

  it('ranks four 16-loop finishers in finish-time order when viewed days after endsAt', () => {
    // Mirrors the actual 3L race: four runners cleared all loops, with
    // different last-loop wall-clock times. After the fix they must
    // appear as ranks 1..4 in-race, ordered by `lastFinishedAt` ascending.
    const now = new Date('2026-09-21T22:30:00+02:00');
    const finisherSlugs = ['alice', 'bob', 'carla'] as const;
    const finishMinutesByLoop16: Record<(typeof finisherSlugs)[number], number> = {
      alice: 50,
      bob: 53,
      carla: 56,
    };
    const punches = finisherSlugs.flatMap((slug) =>
      Array.from({ length: 16 }, (_, index) =>
        punch(
          slug,
          index + 1,
          index === 15
            ? `2026-09-19T21:${String(finishMinutesByLoop16[slug]).padStart(2, '0')}:00+02:00`
            : `2026-09-19T${String(6 + index).padStart(2, '0')}:55:00+02:00`,
        ),
      ),
    );
    const standings = computeStandings(EDITION, RUNNERS, punches, [], now);
    expect(standings.ranked.slice(0, 3).map((entry) => entry.runner.slug)).toEqual([
      'alice',
      'bob',
      'carla',
    ]);
    expect(standings.ranked.slice(0, 3).every((entry) => entry.status.kind === 'in-race')).toBe(
      true,
    );
    expect(standings.ranked.slice(0, 3).map((entry) => entry.rank)).toEqual([1, 2, 3]);
  });

  it('surfaces the fastest runner in fastestLap after a few loops, with the expected durationMs', () => {
    // Alice loop 1 = 45 min, loop 2 = 50 min.
    // Bob   loop 1 = 47 min, loop 2 = 42 min  → Bob holds 42 min.
    // Carla loop 1 = 51 min.
    const now = new Date('2026-09-19T08:30:00+02:00');
    const punches = [
      punch('alice', 1, '2026-09-19T06:45:00+02:00'),
      punch('alice', 2, '2026-09-19T07:50:00+02:00'),
      punch('bob', 1, '2026-09-19T06:47:00+02:00'),
      punch('bob', 2, '2026-09-19T07:42:00+02:00'),
      punch('carla', 1, '2026-09-19T06:51:00+02:00'),
    ];
    const standings = computeStandings(EDITION, RUNNERS, punches, [], now);
    expect(standings.fastestLap).toEqual([{ runnerSlug: 'bob', durationMs: 42 * 60_000 }]);
  });
});
