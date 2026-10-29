/** @Feature sessions */

import type { CalendarPlatform } from './calendar-guide.utils';

export const BAND_CALENDAR_ID =
  '8a2a531ef70d4fcc1be6e3307de65c192f80d852d2be3fa812fe884e92ecb4b3@group.calendar.google.com';

export const BAND_CALENDAR_NAME = 'Activités groupe Pragma';

const GOOGLE_CALENDAR_SUBSCRIBE_ADDRESS = 'https://calendar.google.com/calendar/r';

export type BandCalendarSubscription = 'one-tap' | 'steps';

// @FollowsBlueprint utils-pure-module
export function bandCalendarSubscribeAddress(calendarId: string): string {
  return `${GOOGLE_CALENDAR_SUBSCRIBE_ADDRESS}?cid=${encodeURIComponent(calendarId)}`;
}

// @FollowsBlueprint utils-pure-module
export function bandCalendarSubscriptionOf(platform: CalendarPlatform): BandCalendarSubscription {
  return platform === 'iphone' ? 'steps' : 'one-tap';
}
