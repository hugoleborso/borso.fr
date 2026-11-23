import { type CalendarDay, mondayOfWeek, shiftCalendarDay } from './paris-day.core';

export const JOKERS_PER_WEEK = 3;

const NO_JOKER = 0;
const PREVIOUS_DAY = -1;
const DAYS_PER_WEEK = 7;

export type FlameDayState = 'active' | 'joker' | 'missed' | 'open' | 'future';

export interface FlameWeekDay {
  readonly day: CalendarDay;
  readonly state: FlameDayState;
  readonly isSessionDay: boolean;
}

export interface PersonalFlame {
  readonly days: number;
  readonly isTodayCounted: boolean;
  readonly jokersLeftThisWeek: number;
  readonly week: readonly FlameWeekDay[];
}

export interface BandFlame {
  readonly days: number;
  readonly isTodayCounted: boolean;
}

type JokersSpentByWeek = ReadonlyMap<CalendarDay, number>;

interface Bridge {
  readonly jokersSpent: JokersSpentByWeek;
  readonly bridgedDays: ReadonlySet<CalendarDay>;
  readonly olderActiveDay: CalendarDay;
}

interface FlameWalk {
  readonly days: number;
  readonly jokersSpent: JokersSpentByWeek;
  readonly bridgedDays: ReadonlySet<CalendarDay>;
}

function bridgeWholeGapOrNothing(
  activeDays: ReadonlySet<CalendarDay>,
  newestMissedDay: CalendarDay,
  walk: FlameWalk,
  jokersPerWeek: number,
): Bridge | null {
  const jokersSpentWithGap = new Map(walk.jokersSpent);
  const bridgedDays = new Set(walk.bridgedDays);
  let day = newestMissedDay;
  while (!activeDays.has(day)) {
    const week = mondayOfWeek(day);
    const spentInWeek = (jokersSpentWithGap.get(week) ?? 0) + 1;
    if (spentInWeek > jokersPerWeek) return null;
    jokersSpentWithGap.set(week, spentInWeek);
    bridgedDays.add(day);
    day = shiftCalendarDay(day, PREVIOUS_DAY);
  }
  return { jokersSpent: jokersSpentWithGap, bridgedDays, olderActiveDay: day };
}

function walkFlame(
  activeDays: ReadonlySet<CalendarDay>,
  today: CalendarDay,
  jokersPerWeek: number,
): FlameWalk {
  const yesterday = shiftCalendarDay(today, PREVIOUS_DAY);
  let cursor = activeDays.has(today) ? today : yesterday;
  let walk: FlameWalk = { days: 0, jokersSpent: new Map(), bridgedDays: new Set() };
  for (;;) {
    if (activeDays.has(cursor)) {
      walk = { ...walk, days: walk.days + 1 };
      cursor = shiftCalendarDay(cursor, PREVIOUS_DAY);
      continue;
    }
    const bridge = bridgeWholeGapOrNothing(activeDays, cursor, walk, jokersPerWeek);
    if (bridge === null) return walk;
    walk = { ...walk, jokersSpent: bridge.jokersSpent, bridgedDays: bridge.bridgedDays };
    cursor = bridge.olderActiveDay;
  }
}

function selectDayState(
  day: CalendarDay,
  today: CalendarDay,
  activeDays: ReadonlySet<CalendarDay>,
  bridgedDays: ReadonlySet<CalendarDay>,
): FlameDayState {
  if (day > today) return 'future';
  if (activeDays.has(day)) return 'active';
  if (bridgedDays.has(day)) return 'joker';
  return day === today ? 'open' : 'missed';
}

function buildWeek(
  activeDays: ReadonlySet<CalendarDay>,
  sessionDays: ReadonlySet<CalendarDay>,
  today: CalendarDay,
  bridgedDays: ReadonlySet<CalendarDay>,
): FlameWeekDay[] {
  const monday = mondayOfWeek(today);
  return Array.from({ length: DAYS_PER_WEEK }, (_, offset) => {
    const day = shiftCalendarDay(monday, offset);
    return {
      day,
      state: selectDayState(day, today, activeDays, bridgedDays),
      isSessionDay: sessionDays.has(day),
    };
  });
}

// @FollowsBlueprint core-decision
export function computePersonalFlame(
  presenceDays: Iterable<CalendarDay>,
  sessionDays: ReadonlySet<CalendarDay>,
  today: CalendarDay,
): PersonalFlame {
  const activeDays = new Set([...presenceDays, ...sessionDays]);
  const walk = walkFlame(activeDays, today, JOKERS_PER_WEEK);
  const jokersSpentThisWeek = walk.jokersSpent.get(mondayOfWeek(today)) ?? 0;
  return {
    days: walk.days,
    isTodayCounted: activeDays.has(today),
    jokersLeftThisWeek: JOKERS_PER_WEEK - jokersSpentThisWeek,
    week: buildWeek(activeDays, sessionDays, today, walk.bridgedDays),
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
