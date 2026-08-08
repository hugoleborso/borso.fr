/**
 * Pure fixture arithmetic for the test seeding endpoint. Every schedule the
 * seeder writes is derived here from an explicit `now`, so a fixture's shape
 * can be asserted without a database and without a fake clock.
 */

export type SeedFixtureName =
  'race-down-to-one-survivor' | 'race-finished' | 'top-with-dnf-candidates';

export type EditionStatusName = 'setup' | 'live' | 'finished';

export interface SeedEditionWindow {
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly status: EditionStatusName;
}

export interface SeedPunchPlan {
  readonly runnerSlug: string;
  readonly loopIndex: number;
  readonly finishedAt: Date;
}

export interface SeedDidNotFinishPlan {
  readonly runnerSlug: string;
  readonly outAtLoop: number;
  readonly reason: 'late' | 'manual';
  readonly decidedAt: Date;
}

export interface SeedPlan {
  readonly raceWindow: SeedEditionWindow;
  readonly punches: readonly SeedPunchPlan[];
  readonly didNotFinishes: readonly SeedDidNotFinishPlan[];
}

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const RACE_DURATION_HOURS = 16;
const SURVIVOR_RACE_STARTED_HOURS_AGO = -3;
const TOP_RACE_STARTED_HOURS_AGO = -1;
const TOP_OVERSHOOT_MINUTES = 2;
const FINISHED_RACE_ENDED_MINUTES_AGO = 5;
const SURVIVOR_LOOP_COUNT = 5;
const CHASER_LOOP_COUNT = 3;

function alignedToTopOfHour(now: Date, offsetHours: number): Date {
  const cursor = new Date(now.getTime() + offsetHours * HOUR_MS);
  cursor.setMinutes(0, 0, 0);
  return cursor;
}

function offsetFromStart(startsAt: Date, hours: number): Date {
  return new Date(startsAt.getTime() + hours * HOUR_MS);
}

function planRaceDownToOneSurvivor(now: Date): SeedPlan {
  const startsAt = alignedToTopOfHour(now, SURVIVOR_RACE_STARTED_HOURS_AGO);
  const endsAt = offsetFromStart(startsAt, RACE_DURATION_HOURS);
  return {
    raceWindow: { startsAt, endsAt, status: 'live' },
    punches: [
      { runnerSlug: 'alice', loopIndex: 1, finishedAt: offsetFromStart(startsAt, 0.92) },
      { runnerSlug: 'alice', loopIndex: 2, finishedAt: offsetFromStart(startsAt, 1.93) },
      { runnerSlug: 'alice', loopIndex: 3, finishedAt: offsetFromStart(startsAt, 2.95) },
      { runnerSlug: 'bob', loopIndex: 1, finishedAt: offsetFromStart(startsAt, 0.95) },
      { runnerSlug: 'bob', loopIndex: 2, finishedAt: offsetFromStart(startsAt, 1.97) },
      { runnerSlug: 'carla', loopIndex: 1, finishedAt: offsetFromStart(startsAt, 0.98) },
      { runnerSlug: 'dan', loopIndex: 1, finishedAt: offsetFromStart(startsAt, 0.99) },
    ],
    didNotFinishes: [
      {
        runnerSlug: 'dan',
        outAtLoop: 1,
        reason: 'late',
        decidedAt: offsetFromStart(startsAt, 2),
      },
    ],
  };
}

function planTopWithDidNotFinishCandidates(now: Date): SeedPlan {
  const alignedStart = alignedToTopOfHour(now, TOP_RACE_STARTED_HOURS_AGO);
  const startsAt = new Date(alignedStart.getTime() - TOP_OVERSHOOT_MINUTES * MINUTE_MS);
  const endsAt = offsetFromStart(startsAt, RACE_DURATION_HOURS);
  return {
    raceWindow: { startsAt, endsAt, status: 'live' },
    punches: [
      { runnerSlug: 'alice', loopIndex: 1, finishedAt: offsetFromStart(startsAt, 0.93) },
      { runnerSlug: 'bob', loopIndex: 1, finishedAt: offsetFromStart(startsAt, 0.97) },
    ],
    didNotFinishes: [],
  };
}

function listLoopPunches(
  startsAt: Date,
  runnerSlug: string,
  loopCount: number,
  finishOffsetHours: number,
): readonly SeedPunchPlan[] {
  return Array.from({ length: loopCount }, (_unused, index) => {
    const loopIndex = index + 1;
    return {
      runnerSlug,
      loopIndex,
      finishedAt: offsetFromStart(startsAt, loopIndex - finishOffsetHours),
    };
  });
}

function planRaceFinished(now: Date): SeedPlan {
  const endsAt = new Date(now.getTime() - FINISHED_RACE_ENDED_MINUTES_AGO * MINUTE_MS);
  const startsAt = new Date(endsAt.getTime() - RACE_DURATION_HOURS * HOUR_MS);
  return {
    raceWindow: { startsAt, endsAt, status: 'finished' },
    punches: [
      ...listLoopPunches(startsAt, 'alice', SURVIVOR_LOOP_COUNT, 0.05),
      ...listLoopPunches(startsAt, 'bob', CHASER_LOOP_COUNT, 0.1),
      { runnerSlug: 'carla', loopIndex: 1, finishedAt: offsetFromStart(startsAt, 0.95) },
    ],
    didNotFinishes: [
      { runnerSlug: 'bob', outAtLoop: 3, reason: 'late', decidedAt: offsetFromStart(startsAt, 4) },
      {
        runnerSlug: 'carla',
        outAtLoop: 1,
        reason: 'late',
        decidedAt: offsetFromStart(startsAt, 2),
      },
      {
        runnerSlug: 'dan',
        outAtLoop: 0,
        reason: 'manual',
        decidedAt: offsetFromStart(startsAt, 0.5),
      },
    ],
  };
}

const PLANNER_BY_FIXTURE: Readonly<Record<SeedFixtureName, (now: Date) => SeedPlan>> = {
  'race-down-to-one-survivor': planRaceDownToOneSurvivor,
  'top-with-dnf-candidates': planTopWithDidNotFinishCandidates,
  'race-finished': planRaceFinished,
};

/**
 * Build every row one fixture needs, from the fixture name and an explicit
 * wall clock. Timestamps are relative to `now` so the seeded race window
 * stays inside the punch validator's accepted range.
 */
export function planSeedFixture(fixture: SeedFixtureName, now: Date): SeedPlan {
  return PLANNER_BY_FIXTURE[fixture](now);
}
