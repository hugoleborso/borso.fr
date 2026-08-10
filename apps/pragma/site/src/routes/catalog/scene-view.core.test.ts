import { describe, expect, it } from 'vitest';
import {
  clampSceneFontSize,
  formatSemitoneOffset,
  SCENE_FONT_SIZE_MAX_PX,
  SCENE_FONT_SIZE_MIN_PX,
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
