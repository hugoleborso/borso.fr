import { describe, expect, it } from 'vitest';
import {
  type AnimationMode,
  ANIMATION_MODE_LIST,
  isAnimationMode,
  isCascadeMode,
  isTransformAnimated,
  selectCanvasTransform,
  selectInkbloomAnimation,
  selectInkbloomDelayMs,
} from './animation.core';

// @FollowsBlueprint test-pure-unit
describe('isAnimationMode', () => {
  it.each(ANIMATION_MODE_LIST)('accepts "%s"', (mode) => {
    expect(isAnimationMode(mode)).toBe(true);
  });

  it.each(['', 'STILL', 'shimmer'])('rejects "%s"', (candidate) => {
    expect(isAnimationMode(candidate)).toBe(false);
  });
});

describe('selectCanvasTransform', () => {
  it('moves the rectangles in drift', () => {
    expect(selectCanvasTransform('drift', false)).toBe('drift');
  });

  it('moves the rectangles in breathe', () => {
    expect(selectCanvasTransform('breathe', false)).toBe('breathe');
  });

  it.each(['still', 'cascade'] as const)('leaves the rectangles alone in %s', (mode) => {
    expect(selectCanvasTransform(mode, false)).toBe('none');
  });

  it.each(ANIMATION_MODE_LIST)(
    'leaves the rectangles alone in %s when the reader asked for less motion',
    (mode: AnimationMode) => {
      expect(selectCanvasTransform(mode, true)).toBe('none');
    },
  );
});

describe('isTransformAnimated', () => {
  it('runs a loop for a moving transform', () => {
    expect(isTransformAnimated('drift')).toBe(true);
    expect(isTransformAnimated('breathe')).toBe(true);
  });

  it('runs no loop for a still canvas', () => {
    expect(isTransformAnimated('none')).toBe(false);
  });
});

describe('isCascadeMode', () => {
  it('cascades in cascade mode', () => {
    expect(isCascadeMode('cascade', false)).toBe(true);
  });

  it('does not cascade when the reader asked for less motion', () => {
    expect(isCascadeMode('cascade', true)).toBe(false);
  });

  it('does not cascade in any other mode', () => {
    expect(isCascadeMode('drift', false)).toBe(false);
  });
});

describe('selectInkbloomAnimation', () => {
  it('uses the short animation when the reader asked for less motion', () => {
    expect(selectInkbloomAnimation(true)).toEqual({ name: 'inkbloom-reduced', durationMs: 180 });
  });

  it('uses the full bloom otherwise', () => {
    expect(selectInkbloomAnimation(false)).toEqual({ name: 'inkbloom', durationMs: 700 });
  });
});

describe('selectInkbloomDelayMs', () => {
  it('adds the rectangle jitter to the delay its position earns', () => {
    const threeTenthsOfTheStagger = 180;
    const jitterOfIdentifierSeven = 19;
    expect(
      selectInkbloomDelayMs({
        rectangleIndex: 3,
        rectangleCount: 10,
        rectangleId: 7,
        isReducedMotion: false,
      }),
    ).toBe(threeTenthsOfTheStagger + jitterOfIdentifierSeven);
  });

  it('wraps the jitter back round once an identifier runs past the spread', () => {
    const halfOfTheStagger = 300;
    const jitterOfIdentifierThree = 31;
    expect(
      selectInkbloomDelayMs({
        rectangleIndex: 5,
        rectangleCount: 10,
        rectangleId: 3,
        isReducedMotion: false,
      }),
    ).toBe(halfOfTheStagger + jitterOfIdentifierThree);
  });

  it('staggers later rectangles more than earlier ones', () => {
    const first = selectInkbloomDelayMs({
      rectangleIndex: 0,
      rectangleCount: 10,
      rectangleId: 0,
      isReducedMotion: false,
    });
    const last = selectInkbloomDelayMs({
      rectangleIndex: 9,
      rectangleCount: 10,
      rectangleId: 0,
      isReducedMotion: false,
    });
    expect(last).toBeGreaterThan(first);
  });

  it('gives the same rectangle the same delay every time', () => {
    expect(
      selectInkbloomDelayMs({
        rectangleIndex: 3,
        rectangleCount: 10,
        rectangleId: 7,
        isReducedMotion: false,
      }),
    ).toBe(
      selectInkbloomDelayMs({
        rectangleIndex: 3,
        rectangleCount: 10,
        rectangleId: 7,
        isReducedMotion: false,
      }),
    );
  });

  it('separates two rectangles at the same position by their identifier', () => {
    expect(
      selectInkbloomDelayMs({
        rectangleIndex: 3,
        rectangleCount: 10,
        rectangleId: 7,
        isReducedMotion: false,
      }),
    ).not.toBe(
      selectInkbloomDelayMs({
        rectangleIndex: 3,
        rectangleCount: 10,
        rectangleId: 8,
        isReducedMotion: false,
      }),
    );
  });

  it('blooms everything at once when the reader asked for less motion', () => {
    expect(
      selectInkbloomDelayMs({
        rectangleIndex: 9,
        rectangleCount: 10,
        rectangleId: 4,
        isReducedMotion: true,
      }),
    ).toBe(0);
  });

  it('blooms at once when there are no rectangles to stagger', () => {
    expect(
      selectInkbloomDelayMs({
        rectangleIndex: 0,
        rectangleCount: 0,
        rectangleId: 0,
        isReducedMotion: false,
      }),
    ).toBe(0);
  });
});
