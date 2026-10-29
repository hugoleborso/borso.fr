import { CALENDAR_FEEDS_PER_MEMBER_MAX } from '@domain/input-limits.core';

// @FollowsBlueprint core-decision
export function hasRoomForAnotherFeed(heldFeeds: number): boolean {
  return heldFeeds < CALENDAR_FEEDS_PER_MEMBER_MAX;
}
