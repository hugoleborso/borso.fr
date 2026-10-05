const ISO_DAY_LENGTH = 10;
const YEAR_END = 4;
const MONTH_START = 5;
const MONTH_END = 7;
const DAY_START = 8;
const TWO_DIGITS = 2;
const MONTH_OFFSET = 1;
const NOON_UTC_HOUR = 12;
const UTC = 'UTC';

export const DISPLAY_LOCALE = 'fr-FR';

function padTwoDigits(value: number): string {
  return String(value).padStart(TWO_DIGITS, '0');
}

function parseIsoDayAtNoonUtc(isoDay: string): Date {
  const year = Number(isoDay.slice(0, YEAR_END));
  const month = Number(isoDay.slice(MONTH_START, MONTH_END));
  const day = Number(isoDay.slice(DAY_START, ISO_DAY_LENGTH));
  return new Date(Date.UTC(year, month - MONTH_OFFSET, day, NOON_UTC_HOUR));
}

// @FollowsBlueprint utils-formatter
export function toIsoDay(instant: Date): string {
  return `${instant.getFullYear()}-${padTwoDigits(instant.getMonth() + MONTH_OFFSET)}-${padTwoDigits(instant.getDate())}`;
}

export function addDaysToIsoDay(isoDay: string, dayCount: number): string {
  const shifted = parseIsoDayAtNoonUtc(isoDay);
  shifted.setUTCDate(shifted.getUTCDate() + dayCount);
  return shifted.toISOString().slice(0, ISO_DAY_LENGTH);
}

export function formatShortDay(isoDay: string, locale: string): string {
  return parseIsoDayAtNoonUtc(isoDay).toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: UTC,
  });
}

export function formatLongDay(isoDay: string, locale: string): string {
  return parseIsoDayAtNoonUtc(isoDay).toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: UTC,
  });
}

export function formatMonth(isoDay: string, locale: string): string {
  return parseIsoDayAtNoonUtc(isoDay).toLocaleDateString(locale, {
    month: 'short',
    year: 'numeric',
    timeZone: UTC,
  });
}

export function formatDayWithYear(isoDay: string, locale: string): string {
  return parseIsoDayAtNoonUtc(isoDay).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: UTC,
  });
}
