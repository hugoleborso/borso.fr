/** @Feature auth */

import { isIosDevice } from './device.utils';

export const CALENDAR_PLATFORMS = ['iphone', 'android', 'computer'] as const;

export type CalendarPlatform = (typeof CALENDAR_PLATFORMS)[number];

export const GOOGLE_CALENDAR_SETTINGS_ADDRESS = 'https://calendar.google.com/calendar/r/settings';

const ANDROID_MARKER = 'Android';

// @FollowsBlueprint utils-pure-module
export function selectCalendarPlatform(
  userAgent: string,
  maxTouchPoints: number,
): CalendarPlatform {
  if (isIosDevice(userAgent, maxTouchPoints)) return 'iphone';
  return userAgent.includes(ANDROID_MARKER) ? 'android' : 'computer';
}
