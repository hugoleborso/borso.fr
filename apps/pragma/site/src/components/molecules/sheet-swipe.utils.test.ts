import { describe, expect, it } from 'vitest';
import {
  followSwipeDown,
  SWIPE_CLOSE_DISTANCE_PX,
  shouldCloseAfterSwipe,
} from './sheet-swipe.utils';

describe('followSwipeDown', () => {
  it('follows the finger downwards', () => {
    expect(followSwipeDown(100, 160)).toBe(60);
  });

  it('never lifts the sheet above where it rests', () => {
    expect(followSwipeDown(100, 40)).toBe(0);
  });
});

describe('shouldCloseAfterSwipe', () => {
  it('closes from the threshold on', () => {
    expect(shouldCloseAfterSwipe(SWIPE_CLOSE_DISTANCE_PX)).toBe(true);
  });

  it('springs back below it', () => {
    expect(shouldCloseAfterSwipe(SWIPE_CLOSE_DISTANCE_PX - 1)).toBe(false);
  });
});
