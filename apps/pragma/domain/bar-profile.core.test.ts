import { describe, expect, it } from 'vitest';
import { AVAILABLE_SUPPORTS, BAR_STATUSES, CONCERT_MOODS } from './bar-profile.core';

// @FollowsBlueprint test-pure-unit
describe('bar profile', () => {
  it('orders the statuses the way a booking conversation moves', () => {
    expect(BAR_STATUSES).toEqual(['lead', 'contacted', 'booked', 'played', 'cold']);
  });

  it('names each mood and each support once', () => {
    expect(new Set(CONCERT_MOODS).size).toBe(CONCERT_MOODS.length);
    expect(new Set(AVAILABLE_SUPPORTS).size).toBe(AVAILABLE_SUPPORTS.length);
  });
});
