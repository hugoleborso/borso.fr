import { describe, expect, it } from 'vitest';
import {
  hasMovedBeyondTolerance,
  selectCommittedSwipe,
  selectSwipeOffset,
} from './press-gesture.core';

const ORIGIN = { x: 100, y: 100 };
const BOTH = { right: true, left: true };

describe('hasMovedBeyondTolerance', () => {
  it('tolerates a finger that trembles and gives up past ten pixels', () => {
    expect(hasMovedBeyondTolerance(ORIGIN, { x: 106, y: 108 })).toBe(false);
    expect(hasMovedBeyondTolerance(ORIGIN, { x: 107, y: 108 })).toBe(true);
  });
});

describe('selectSwipeOffset', () => {
  it('follows a rightward drag up to a ceiling', () => {
    expect(selectSwipeOffset(ORIGIN, { x: 140, y: 110 }, BOTH)).toBe(40);
    expect(selectSwipeOffset(ORIGIN, { x: 400, y: 100 }, BOTH)).toBe(112);
  });

  it('follows a leftward drag down to a floor', () => {
    expect(selectSwipeOffset(ORIGIN, { x: 60, y: 110 }, BOTH)).toBe(-40);
    expect(selectSwipeOffset(ORIGIN, { x: -200, y: 100 }, BOTH)).toBe(-112);
  });

  it('stays at rest for a direction that is not offered', () => {
    expect(selectSwipeOffset(ORIGIN, { x: 60, y: 100 }, { right: true, left: false })).toBe(0);
    expect(selectSwipeOffset(ORIGIN, { x: 140, y: 100 }, { right: false, left: true })).toBe(0);
  });

  it('stays at rest for a mostly vertical drag', () => {
    expect(selectSwipeOffset(ORIGIN, { x: 130, y: 130 }, BOTH)).toBe(0);
    expect(selectSwipeOffset(ORIGIN, { x: 70, y: 70 }, BOTH)).toBe(0);
    expect(selectSwipeOffset(ORIGIN, { x: 130, y: 70 }, BOTH)).toBe(0);
  });
});

describe('selectCommittedSwipe', () => {
  it('commits from eighty pixels on, either way', () => {
    expect(selectCommittedSwipe(79)).toBeNull();
    expect(selectCommittedSwipe(80)).toBe('right');
    expect(selectCommittedSwipe(-79)).toBeNull();
    expect(selectCommittedSwipe(-80)).toBe('left');
    expect(selectCommittedSwipe(0)).toBeNull();
  });
});
