import { describe, expect, it } from 'vitest';
import {
  clampSceneFontSize,
  clampSceneScrollSpeed,
  clampSemitoneOffset,
  computeScrollStepPx,
  formatSemitoneOffset,
  SCENE_FONT_SIZE_MAX_PX,
  SCENE_FONT_SIZE_MIN_PX,
  SCENE_SCROLL_SPEED_DEFAULT_PX_PER_SECOND,
  SCENE_SCROLL_SPEED_MAX_PX_PER_SECOND,
  SCENE_SCROLL_SPEED_MIN_PX_PER_SECOND,
  SCENE_TRANSPOSE_MAX_SEMITONES,
  SCENE_TRANSPOSE_MIN_SEMITONES,
} from './scene-view.core';

// @FollowsBlueprint test-pure-unit
describe('clampSceneFontSize', () => {
  it('keeps a size inside the readable range', () => {
    expect(clampSceneFontSize(24)).toBe(24);
  });

  it('clamps below the floor', () => {
    expect(clampSceneFontSize(2)).toBe(SCENE_FONT_SIZE_MIN_PX);
  });

  it('clamps above the ceiling', () => {
    expect(clampSceneFontSize(400)).toBe(SCENE_FONT_SIZE_MAX_PX);
  });
});

describe('clampSemitoneOffset', () => {
  it('keeps an offset inside the range that changes the chart', () => {
    expect(clampSemitoneOffset(0)).toBe(0);
    expect(clampSemitoneOffset(-3)).toBe(-3);
  });

  it('stops one step short of the octave going up', () => {
    expect(clampSemitoneOffset(12)).toBe(SCENE_TRANSPOSE_MAX_SEMITONES);
  });

  it('stops one step short of the octave going down', () => {
    expect(clampSemitoneOffset(-12)).toBe(SCENE_TRANSPOSE_MIN_SEMITONES);
  });
});

describe('formatSemitoneOffset', () => {
  it('signs a positive offset', () => {
    expect(formatSemitoneOffset(3)).toBe('+3');
  });

  it('signs zero as positive', () => {
    expect(formatSemitoneOffset(0)).toBe('+0');
  });

  it('leaves a negative offset as written', () => {
    expect(formatSemitoneOffset(-2)).toBe('-2');
  });
});

describe('clampSceneScrollSpeed', () => {
  it('keeps a speed inside the range a reader can follow', () => {
    expect(clampSceneScrollSpeed(SCENE_SCROLL_SPEED_DEFAULT_PX_PER_SECOND)).toBe(
      SCENE_SCROLL_SPEED_DEFAULT_PX_PER_SECOND,
    );
  });

  it('clamps a speed slower than the floor', () => {
    expect(clampSceneScrollSpeed(0)).toBe(SCENE_SCROLL_SPEED_MIN_PX_PER_SECOND);
  });

  it('clamps a speed faster than the ceiling', () => {
    expect(clampSceneScrollSpeed(900)).toBe(SCENE_SCROLL_SPEED_MAX_PX_PER_SECOND);
  });
});

describe('computeScrollStepPx', () => {
  it('turns a speed per second into the distance covered by one tick', () => {
    expect(computeScrollStepPx(30, 100)).toBeCloseTo(3);
  });

  it('covers the full speed over a full second', () => {
    expect(computeScrollStepPx(48, 1000)).toBe(48);
  });
});
