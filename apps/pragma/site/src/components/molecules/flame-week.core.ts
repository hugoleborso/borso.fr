import type { CalendarDay } from '@domain/paris-day.core';
import type { FlameDayState, FlameWeekDay } from '@domain/practice-flame.core';
import type { FlameTone } from '../atoms/flame-mark.utils';

export type WeekCaptionKey =
  | 'streaks.caption.joker'
  | 'streaks.caption.today'
  | 'streaks.caption.session';

const DAY_LABEL_KEY = {
  active: 'streaks.dayState.active',
  joker: 'streaks.dayState.joker',
  missed: 'streaks.dayState.missed',
  open: 'streaks.dayState.open',
  future: 'streaks.dayState.future',
} as const satisfies Readonly<Record<FlameDayState, string>>;

export type WeekDayLabelKey = (typeof DAY_LABEL_KEY)[FlameDayState];

const DAY_TONE: Readonly<Record<FlameDayState, FlameTone | null>> = {
  active: 'counted',
  joker: 'out',
  missed: null,
  open: 'open',
  future: null,
};

const UTC_TIME_ZONE = 'UTC';

export interface WeekCell {
  readonly day: CalendarDay;
  readonly state: FlameDayState;
  readonly isToday: boolean;
  readonly tone: FlameTone | null;
  readonly captionKey: WeekCaptionKey | null;
  readonly labelKey: WeekDayLabelKey;
  readonly letter: string;
  readonly weekdayName: string;
}

function selectCaptionKey(weekDay: FlameWeekDay, today: CalendarDay): WeekCaptionKey | null {
  if (weekDay.state === 'joker') return 'streaks.caption.joker';
  if (weekDay.day === today) return 'streaks.caption.today';
  return weekDay.isSessionDay ? 'streaks.caption.session' : null;
}

function formatWeekday(
  day: CalendarDay,
  locale: string,
  weekday: 'narrow' | 'short' | 'long',
): string {
  const formatter = new Intl.DateTimeFormat(locale, { weekday, timeZone: UTC_TIME_ZONE });
  return formatter.format(new Date(day));
}

// @FollowsBlueprint core-label-key
export function buildWeekCells(
  week: readonly FlameWeekDay[],
  today: CalendarDay,
  locale: string,
): WeekCell[] {
  return week.map((weekDay) => ({
    day: weekDay.day,
    state: weekDay.state,
    isToday: weekDay.day === today,
    tone: DAY_TONE[weekDay.state],
    captionKey: selectCaptionKey(weekDay, today),
    labelKey: DAY_LABEL_KEY[weekDay.state],
    letter: formatWeekday(weekDay.day, locale, 'narrow'),
    weekdayName: formatWeekday(weekDay.day, locale, 'long'),
  }));
}

export type JokerPipKind = 'spent' | 'left';

export interface JokerPip {
  readonly id: string;
  readonly kind: JokerPipKind;
  readonly weekdayName: string | null;
}

export function buildJokerPips(
  week: readonly FlameWeekDay[],
  jokersLeft: number,
  locale: string,
): JokerPip[] {
  const spent = week
    .filter((weekDay) => weekDay.state === 'joker')
    .map((weekDay): JokerPip => ({
      id: weekDay.day,
      kind: 'spent',
      weekdayName: formatWeekday(weekDay.day, locale, 'short'),
    }));
  const left = Array.from({ length: jokersLeft }, (_, index): JokerPip => ({
    id: `left-${index}`,
    kind: 'left',
    weekdayName: null,
  }));
  return [...spent, ...left];
}
