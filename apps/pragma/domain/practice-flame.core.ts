import { type CalendarDay, mondayOfWeek, shiftCalendarDay } from './paris-day.core';

export const JOKERS_PER_WEEK = 3;

const NO_JOKER = 0;
const PREVIOUS_DAY = -1;

export interface PersonalFlame {
  readonly days: number;
  readonly isTodayCounted: boolean;
  readonly jokersLeftThisWeek: number;
}

export interface BandFlame {
  readonly days: number;
  readonly isTodayCounted: boolean;
}

type JokersSpentByWeek = ReadonlyMap<CalendarDay, number>;

interface Bridge {
  readonly jokersSpent: JokersSpentByWeek;
  readonly olderActiveDay: CalendarDay;
}

interface FlameWalk {
  readonly days: number;
  readonly jokersSpent: JokersSpentByWeek;
}

function bridgeWholeGapOrNothing(
  activeDays: ReadonlySet<CalendarDay>,
  newestMissedDay: CalendarDay,
  jokersSpent: JokersSpentByWeek,
  jokersPerWeek: number,
): Bridge | null {
  const jokersSpentWithGap = new Map(jokersSpent);
  let day = newestMissedDay;
  while (!activeDays.has(day)) {
    const week = mondayOfWeek(day);
    const spentInWeek = (jokersSpentWithGap.get(week) ?? 0) + 1;
    if (spentInWeek > jokersPerWeek) return null;
    jokersSpentWithGap.set(week, spentInWeek);
    day = shiftCalendarDay(day, PREVIOUS_DAY);
  }
  return { jokersSpent: jokersSpentWithGap, olderActiveDay: day };
}

function walkFlame(
  activeDays: ReadonlySet<CalendarDay>,
  today: CalendarDay,
  jokersPerWeek: number,
): FlameWalk {
  const yesterday = shiftCalendarDay(today, PREVIOUS_DAY);
  let cursor = activeDays.has(today) ? today : yesterday;
  let days = 0;
  let jokersSpent: JokersSpentByWeek = new Map();
  for (;;) {
    if (activeDays.has(cursor)) {
      days += 1;
      cursor = shiftCalendarDay(cursor, PREVIOUS_DAY);
      continue;
    }
    const bridge = bridgeWholeGapOrNothing(activeDays, cursor, jokersSpent, jokersPerWeek);
    if (bridge === null) return { days, jokersSpent };
    jokersSpent = bridge.jokersSpent;
    cursor = bridge.olderActiveDay;
  }
}

// @FollowsBlueprint core-decision
export function computePersonalFlame(
  activeDays: ReadonlySet<CalendarDay>,
  today: CalendarDay,
): PersonalFlame {
  const walk = walkFlame(activeDays, today, JOKERS_PER_WEEK);
  const jokersSpentThisWeek = walk.jokersSpent.get(mondayOfWeek(today)) ?? 0;
  return {
    days: walk.days,
    isTodayCounted: activeDays.has(today),
    jokersLeftThisWeek: JOKERS_PER_WEEK - jokersSpentThisWeek,
  };
}

export function computeBandFlame(
  activeDays: ReadonlySet<CalendarDay>,
  today: CalendarDay,
): BandFlame {
  return {
    days: walkFlame(activeDays, today, NO_JOKER).days,
    isTodayCounted: activeDays.has(today),
  };
}
