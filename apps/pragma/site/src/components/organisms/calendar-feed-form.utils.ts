/** @Feature auth */

export const CALENDAR_SECTION_ID = 'calendar';

export const CALENDAR_SECTION_PATH = `/account?view=${CALENDAR_SECTION_ID}`;

export type CalendarFeedFormMode = 'entering' | 'replacing' | 'connected';

// @FollowsBlueprint utils-pure-module
export function selectCalendarFeedFormMode(
  state: 'connected' | 'absent',
  isReplacing: boolean,
): CalendarFeedFormMode {
  if (state === 'absent') return 'entering';
  return isReplacing ? 'replacing' : 'connected';
}
