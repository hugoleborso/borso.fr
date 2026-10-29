import { describe, expect, it } from 'vitest';
import { CALENDAR_FEEDS_PER_MEMBER_MAX } from '@domain/input-limits.core';
import { hasRoomForAnotherFeed } from './feed-cap.core';

// @FollowsBlueprint test-pure-unit
describe('hasRoomForAnotherFeed', () => {
  it('lets a member add calendars up to the cap, and not one more', () => {
    expect(hasRoomForAnotherFeed(0)).toBe(true);
    expect(hasRoomForAnotherFeed(CALENDAR_FEEDS_PER_MEMBER_MAX - 1)).toBe(true);
    expect(hasRoomForAnotherFeed(CALENDAR_FEEDS_PER_MEMBER_MAX)).toBe(false);
  });
});
