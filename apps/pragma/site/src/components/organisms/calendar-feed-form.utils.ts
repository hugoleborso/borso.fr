/** @Feature auth */

import { CALENDAR_FEEDS_PER_MEMBER_MAX } from '@domain/input-limits.core';

export const CALENDAR_SECTION_ID = 'calendar';

export const CALENDAR_SECTION_PATH = `/account?view=${CALENDAR_SECTION_ID}`;

export type CalendarFeedFormMode = 'entering' | 'adding' | 'listing' | 'full';

// @FollowsBlueprint utils-pure-module
export function selectCalendarFeedFormMode(
  feedCount: number,
  isAdding: boolean,
): CalendarFeedFormMode {
  if (feedCount === 0) return 'entering';
  if (feedCount >= CALENDAR_FEEDS_PER_MEMBER_MAX) return 'full';
  return isAdding ? 'adding' : 'listing';
}

const CONFLICT_STATUS = 409;

export function selectCalendarFeedErrorKey(
  status: number | null,
): 'account.calendarFeedsFull' | 'account.calendarFeedInvalid' {
  return status === CONFLICT_STATUS ? 'account.calendarFeedsFull' : 'account.calendarFeedInvalid';
}
