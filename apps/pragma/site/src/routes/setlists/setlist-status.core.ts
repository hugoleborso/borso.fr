/** @Feature setlist-voting */

export const SETLIST_LOCKED = 'locked';
export const SETLIST_VOTING = 'voting';

export type SetlistStatus = typeof SETLIST_LOCKED | typeof SETLIST_VOTING;

// @FollowsBlueprint core-decision
export function resolveSetlistStatus(stored: string | null | undefined): SetlistStatus {
  return stored === SETLIST_VOTING ? SETLIST_VOTING : SETLIST_LOCKED;
}
