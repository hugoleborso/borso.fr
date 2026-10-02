import {
  addCalendarDays,
  type CalendarDay,
  parisCalendarDayOf,
} from '../helpers/paris-time/paris-time.core';

export const FIXTURE_FEED_NAMES = ['hugo', 'marc', 'sarah'] as const;
export type FixtureFeedName = (typeof FIXTURE_FEED_NAMES)[number];

export const FREE_DAY_OFFSET = 2;
const SECOND_GAP_DAY_OFFSET = 5;
const UNRELATED_DAY_OFFSET = 3;
const DAILY_OCCURRENCES = 40;
const MIDNIGHT = { hour: 0, minute: 0 } as const;
const MARC_FREE_FROM = { hour: 19, minute: 10 } as const;
const SARAH_CANCELLED_FROM = { hour: 20, minute: 0 } as const;
const SARAH_CANCELLED_UNTIL = { hour: 21, minute: 0 } as const;
const SARAH_LATE_FROM = { hour: 23, minute: 0 } as const;
const SARAH_LATE_UNTIL = { hour: 23, minute: 59 } as const;
const NEW_YORK_NOON = { hour: 12, minute: 0 } as const;
const FEED_EXTENSION = '.ics';
const GONE_FEED_FILE = 'gone.ics';
const SLOW_FEED_FILE = 'slow.ics';
const SLOW_FEED_DELAY_MS = 6_000;
const NO_DELAY_MS = 0;
const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;
const HTTP_GONE = 410;
const LINE_BREAK = '\r\n';
const TWO_DIGITS = 2;
const FOUR_DIGITS = 4;

function padded(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

function dateValue(calendarDay: CalendarDay): string {
  return `${padded(calendarDay.year, FOUR_DIGITS)}${padded(calendarDay.month, TWO_DIGITS)}${padded(calendarDay.day, TWO_DIGITS)}`;
}

interface ClockTime {
  readonly hour: number;
  readonly minute: number;
}

function wallTimeValue(calendarDay: CalendarDay, clockTime: ClockTime): string {
  return `${dateValue(calendarDay)}T${padded(clockTime.hour, TWO_DIGITS)}${padded(clockTime.minute, TWO_DIGITS)}00`;
}

function calendar(events: readonly string[][]): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//pragma//preview fixtures//EN',
    ...events.flat(),
    'END:VCALENDAR',
    '',
  ].join(LINE_BREAK);
}

function event(uid: string, lines: readonly string[]): string[] {
  return ['BEGIN:VEVENT', `UID:${uid}@pragma-fixtures`, ...lines, 'END:VEVENT'];
}

function busyEveryDayButTwo(today: CalendarDay): string {
  return calendar([
    event('hugo-daily', [
      `DTSTART:${wallTimeValue(today, MIDNIGHT)}`,
      `DTEND:${wallTimeValue(addCalendarDays(today, 1), MIDNIGHT)}`,
      `RRULE:FREQ=DAILY;COUNT=${DAILY_OCCURRENCES}`,
      `EXDATE:${wallTimeValue(addCalendarDays(today, FREE_DAY_OFFSET), MIDNIGHT)}`,
      `EXDATE:${wallTimeValue(addCalendarDays(today, SECOND_GAP_DAY_OFFSET), MIDNIGHT)}`,
    ]),
  ]);
}

function busyUntilEarlyEvening(today: CalendarDay): string {
  const freeDay = addCalendarDays(today, FREE_DAY_OFFSET);
  const secondGap = addCalendarDays(today, SECOND_GAP_DAY_OFFSET);
  return calendar([
    event('marc-afternoon', [
      `DTSTART:${wallTimeValue(freeDay, MIDNIGHT)}`,
      `DTEND:${wallTimeValue(freeDay, MARC_FREE_FROM)}`,
    ]),
    event('marc-free-all-day', [
      `DTSTART;VALUE=DATE:${dateValue(freeDay)}`,
      `DTEND;VALUE=DATE:${dateValue(addCalendarDays(freeDay, 1))}`,
      'TRANSP:TRANSPARENT',
    ]),
    event('marc-busy-all-day', [
      `DTSTART;VALUE=DATE:${dateValue(secondGap)}`,
      `DTEND;VALUE=DATE:${dateValue(addCalendarDays(secondGap, 1))}`,
    ]),
  ]);
}

function busyLateWithACancellation(today: CalendarDay): string {
  const freeDay = addCalendarDays(today, FREE_DAY_OFFSET);
  return calendar([
    event('sarah-cancelled', [
      `DTSTART:${wallTimeValue(freeDay, SARAH_CANCELLED_FROM)}`,
      `DTEND:${wallTimeValue(freeDay, SARAH_CANCELLED_UNTIL)}`,
      'STATUS:CANCELLED',
    ]),
    event('sarah-late', [
      `DTSTART:${wallTimeValue(freeDay, SARAH_LATE_FROM)}`,
      `DTEND:${wallTimeValue(freeDay, SARAH_LATE_UNTIL)}`,
    ]),
    event('sarah-abroad', [
      `DTSTART;TZID=America/New_York:${wallTimeValue(addCalendarDays(today, UNRELATED_DAY_OFFSET), NEW_YORK_NOON)}`,
      'DURATION:PT1H',
    ]),
  ]);
}

const FIXTURE_BUILDERS: Readonly<Record<FixtureFeedName, (today: CalendarDay) => string>> = {
  hugo: busyEveryDayButTwo,
  marc: busyUntilEarlyEvening,
  sarah: busyLateWithACancellation,
};

export function isFixtureFeedName(name: string): name is FixtureFeedName {
  return FIXTURE_FEED_NAMES.some((candidate) => candidate === name);
}

// @FollowsBlueprint core-decision
export function buildFixtureFeed(name: FixtureFeedName, now: Date): string {
  return FIXTURE_BUILDERS[name](parisCalendarDayOf(now));
}

export interface FixtureFeedAnswer {
  readonly status: number;
  readonly body: string | null;
  readonly delayMs: number;
}

const ANSWER_BY_SPECIAL_FILE: Readonly<Record<string, FixtureFeedAnswer>> = {
  [GONE_FEED_FILE]: { status: HTTP_GONE, body: null, delayMs: NO_DELAY_MS },
  [SLOW_FEED_FILE]: { status: HTTP_NOT_FOUND, body: null, delayMs: SLOW_FEED_DELAY_MS },
};

const NOT_A_FIXTURE: FixtureFeedAnswer = {
  status: HTTP_NOT_FOUND,
  body: null,
  delayMs: NO_DELAY_MS,
};

export function answerFixtureFeedRequest(fileName: string, now: Date): FixtureFeedAnswer {
  const special = ANSWER_BY_SPECIAL_FILE[fileName];
  if (special !== undefined) return special;
  const name = fileName.endsWith(FEED_EXTENSION)
    ? fileName.slice(0, -FEED_EXTENSION.length)
    : fileName;
  if (!isFixtureFeedName(name)) return NOT_A_FIXTURE;
  return { status: HTTP_OK, body: buildFixtureFeed(name, now), delayMs: NO_DELAY_MS };
}

export interface SeededMember {
  readonly memberId: string;
  readonly username: string;
}

export interface FixtureFeedAttachment {
  readonly memberId: string;
  readonly address: string;
}

export function listFixtureFeedAttachments(
  members: readonly SeededMember[],
  feedOrigin: string,
): FixtureFeedAttachment[] {
  return members
    .filter((member) => isFixtureFeedName(member.username))
    .map((member) => ({
      memberId: member.memberId,
      address: `${feedOrigin}/api/__test/calendar-feeds/${member.username}${FEED_EXTENSION}`,
    }));
}

export function countSavedFeeds(outcomes: readonly { readonly kind: string }[]): number {
  return outcomes.filter((outcome) => outcome.kind === 'saved').length;
}
