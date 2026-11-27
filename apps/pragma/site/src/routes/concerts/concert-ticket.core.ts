/** @Feature concert-registrations */

import { BAND_TIME_ZONE } from '@domain/band-time-zone.core';
import type { ConcertPrizeIcon } from '@domain/concert-prize.core';
import type { IconName } from '../../components/atoms/Icon';

export interface TicketDate {
  readonly day: string;
  readonly month: string;
  readonly weekday: string;
  readonly hour: string;
  readonly shortDate: string;
}

export type TicketLayout = 'poster' | 'date';

const MAP_SEARCH_URL = 'https://www.google.com/maps/search/';
const ON_THE_HOUR = 0;
const MINUTE_DIGITS = 2;
const FRENCH = 'fr';

function formatPart(date: Date, locale: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale, { timeZone: BAND_TIME_ZONE, ...options }).format(date);
}

function readParisClockPart(date: Date, options: Intl.DateTimeFormatOptions): number {
  return Number(formatPart(date, 'en', { hourCycle: 'h23', ...options }));
}

function formatHour(date: Date, locale: string): string {
  const hour = readParisClockPart(date, { hour: 'numeric' });
  const minute = readParisClockPart(date, { minute: 'numeric' });
  if (new Intl.Locale(locale).language === FRENCH) {
    if (minute === ON_THE_HOUR) return `${hour} h`;
    return `${hour} h ${String(minute).padStart(MINUTE_DIGITS, '0')}`;
  }
  const hourOptions: Intl.DateTimeFormatOptions =
    minute === ON_THE_HOUR ? { hour: 'numeric' } : { hour: 'numeric', minute: '2-digit' };
  return formatPart(date, locale, hourOptions);
}

// @FollowsBlueprint core-view-projection
export function formatTicketDate(iso: string, locale: string): TicketDate {
  const date = new Date(iso);
  return {
    day: formatPart(date, locale, { day: 'numeric' }),
    month: formatPart(date, locale, { month: 'long' }),
    weekday: formatPart(date, locale, { weekday: 'long' }),
    hour: formatHour(date, locale),
    shortDate: formatPart(date, locale, { day: 'numeric', month: 'short' }),
  };
}

export function buildVenueMapUrl(venue: string): string {
  const query = new URLSearchParams({ api: '1', query: venue });
  return `${MAP_SEARCH_URL}?${query.toString()}`;
}

export function buildConcertCalendarUrl(apiBase: string, sessionId: string): string {
  return `${apiBase}/api/concert-registrations/concerts/${encodeURIComponent(sessionId)}/calendar`;
}

export function selectTicketLayout(posterUrl: string | null): TicketLayout {
  return posterUrl === null ? 'date' : 'poster';
}

export const PRIZE_ICON_GLYPH = {
  beer: 'pint',
  gift: 'gift',
  ticket: 'ticket',
  shirt: 'shirt',
} as const satisfies Readonly<Record<ConcertPrizeIcon, IconName>>;
