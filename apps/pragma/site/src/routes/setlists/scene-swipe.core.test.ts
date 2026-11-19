import { describe, expect, it } from 'vitest';
import { SCENE_SWIPE_DISTANCE_PX, selectSwipeCommand } from './scene-swipe.core';

// @FollowsBlueprint test-pure-unit
describe('selectSwipeCommand', () => {
  it('reads a swipe to the left as the next song', () => {
    expect(selectSwipeCommand(-SCENE_SWIPE_DISTANCE_PX, 0)).toBe('next');
  });

  it('reads a swipe to the right as the previous song', () => {
    expect(selectSwipeCommand(SCENE_SWIPE_DISTANCE_PX, 0)).toBe('previous');
  });

  it('ignores a swipe shorter than the distance', () => {
    expect(selectSwipeCommand(SCENE_SWIPE_DISTANCE_PX - 1, 0)).toBeNull();
    expect(selectSwipeCommand(-(SCENE_SWIPE_DISTANCE_PX - 1), 0)).toBeNull();
  });

  it('ignores a gesture that mostly scrolls the chart', () => {
    expect(selectSwipeCommand(-89, 60)).toBeNull();
    expect(selectSwipeCommand(-90, 60)).toBe('next');
    expect(selectSwipeCommand(89, -60)).toBeNull();
  });
});
