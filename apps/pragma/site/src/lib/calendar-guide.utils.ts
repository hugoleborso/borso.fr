/** @Feature auth */

import { isIosDevice } from './device.utils';

export const CALENDAR_PLATFORMS = ['iphone', 'android', 'computer'] as const;

export type CalendarPlatform = (typeof CALENDAR_PLATFORMS)[number];

export type CalendarGuideStep =
  | 'iphone-open-calendars'
  | 'iphone-tap-info'
  | 'iphone-share-link'
  | 'google-open-settings'
  | 'google-integrate'
  | 'google-copy-secret'
  | 'outlook-publish'
  | 'paste-here';

export interface CalendarGuide {
  readonly steps: readonly CalendarGuideStep[];
  readonly settingsAddress: string | null;
}

export const GOOGLE_CALENDAR_SETTINGS_ADDRESS = 'https://calendar.google.com/calendar/r/settings';

const ANDROID_MARKER = 'Android';

const GOOGLE_STEPS: readonly CalendarGuideStep[] = [
  'google-open-settings',
  'google-integrate',
  'google-copy-secret',
];

const GUIDE_BY_PLATFORM: Readonly<Record<CalendarPlatform, CalendarGuide>> = {
  iphone: {
    steps: ['iphone-open-calendars', 'iphone-tap-info', 'iphone-share-link', 'paste-here'],
    settingsAddress: null,
  },
  android: {
    steps: [...GOOGLE_STEPS, 'paste-here'],
    settingsAddress: GOOGLE_CALENDAR_SETTINGS_ADDRESS,
  },
  computer: {
    steps: [...GOOGLE_STEPS, 'outlook-publish', 'paste-here'],
    settingsAddress: GOOGLE_CALENDAR_SETTINGS_ADDRESS,
  },
};

// @FollowsBlueprint utils-pure-module
export function selectCalendarPlatform(
  userAgent: string,
  maxTouchPoints: number,
): CalendarPlatform {
  if (isIosDevice(userAgent, maxTouchPoints)) return 'iphone';
  return userAgent.includes(ANDROID_MARKER) ? 'android' : 'computer';
}

// @FollowsBlueprint utils-pure-module
export function calendarGuideOf(platform: CalendarPlatform): CalendarGuide {
  return GUIDE_BY_PLATFORM[platform];
}
