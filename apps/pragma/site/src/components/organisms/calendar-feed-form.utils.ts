/** @Feature auth */

export type CalendarFeedFormMode = 'entering' | 'replacing' | 'connected';

// @FollowsBlueprint utils-pure-module
export function selectCalendarFeedFormMode(
  state: 'connected' | 'absent',
  isReplacing: boolean,
): CalendarFeedFormMode {
  if (state === 'absent') return 'entering';
  return isReplacing ? 'replacing' : 'connected';
}
