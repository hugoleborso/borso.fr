import { describe, expect, it } from 'vitest';
import { hasMovedBeyondTolerance, isSwipeCommitted, selectSwipeOffset } from './press-gesture.core';

const ORIGIN = { x: 100, y: 100 };

describe('hasMovedBeyondTolerance', () => {
  it('tolerates a finger that trembles and gives up past ten pixels', () => {
    expect(hasMovedBeyondTolerance(ORIGIN, { x: 106, y: 108 })).toBe(false);
    expect(hasMovedBeyondTolerance(ORIGIN, { x: 107, y: 108 })).toBe(true);
  });
});

describe('selectSwipeOffset', () => {
  it('follows a rightward drag up to a ceiling', () => {
    expect(selectSwipeOffset(ORIGIN, { x: 140, y: 110 })).toBe(40);
    expect(selectSwipeOffset(ORIGIN, { x: 400, y: 100 })).toBe(112);
  });

  it('stays at rest for a leftward or a mostly vertical drag', () => {
    expect(selectSwipeOffset(ORIGIN, { x: 60, y: 100 })).toBe(0);
    expect(selectSwipeOffset(ORIGIN, { x: 130, y: 130 })).toBe(0);
    expect(selectSwipeOffset(ORIGIN, { x: 130, y: 70 })).toBe(0);
  });
});

describe('isSwipeCommitted', () => {
  it('commits from eighty pixels on', () => {
    expect(isSwipeCommitted(79)).toBe(false);
    expect(isSwipeCommitted(80)).toBe(true);
  });
});
