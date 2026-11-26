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

function formatPart(date: Date, locale: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale, { timeZone: BAND_TIME_ZONE, ...options }).format(date);
}

function readParisMinute(date: Date): number {
  return Number(formatPart(date, 'en', { minute: 'numeric' }));
}

// @FollowsBlueprint core-view-projection
export function formatTicketDate(iso: string, locale: string): TicketDate {
  const date = new Date(iso);
  const hourOptions: Intl.DateTimeFormatOptions =
    readParisMinute(date) === ON_THE_HOUR
      ? { hour: 'numeric' }
      : { hour: 'numeric', minute: '2-digit' };
  return {
    day: formatPart(date, locale, { day: 'numeric' }),
    month: formatPart(date, locale, { month: 'long' }),
    weekday: formatPart(date, locale, { weekday: 'long' }),
    hour: formatPart(date, locale, hourOptions),
    shortDate: formatPart(date, locale, { day: 'numeric', month: 'short' }),
  };
}

export function buildVenueMapUrl(venue: string): string {
  const query = new URLSearchParams({ api: '1', query: venue });
  return `${MAP_SEARCH_URL}?${query.toString()}`;
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
