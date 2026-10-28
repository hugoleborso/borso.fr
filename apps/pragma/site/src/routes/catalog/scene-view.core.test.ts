import { describe, expect, it } from 'vitest';
import {
  buildSceneAddressFromPractice,
  selectSceneExitPath,
  canScrollFaster,
  canScrollSlower,
  canTransposeDown,
  canTransposeUp,
  canZoomIn,
  canZoomOut,
  clampSceneFontSize,
  clampSceneScrollSpeed,
  clampSemitoneOffset,
  computeScrollStepPx,
  formatSemitoneOffset,
  SCENE_FONT_SIZE_DEFAULT_PX,
  SCENE_SCROLL_SPEED_DEFAULT_PX_PER_SECOND,
} from './scene-view.core';

const FONT_SIZE_FLOOR_PX = 16;
const FONT_SIZE_CEILING_PX = 48;
const TRANSPOSE_LIMIT_SEMITONES = 11;
const SCROLL_SPEED_FLOOR_PX_PER_SECOND = 10;
const SCROLL_SPEED_CEILING_PX_PER_SECOND = 120;

// @FollowsBlueprint test-pure-unit
describe('clampSceneFontSize', () => {
  it('keeps a size inside the readable range', () => {
    expect(clampSceneFontSize(SCENE_FONT_SIZE_DEFAULT_PX)).toBe(SCENE_FONT_SIZE_DEFAULT_PX);
  });

  it('clamps below the floor', () => {
    expect(clampSceneFontSize(2)).toBe(FONT_SIZE_FLOOR_PX);
  });

  it('clamps above the ceiling', () => {
    expect(clampSceneFontSize(400)).toBe(FONT_SIZE_CEILING_PX);
  });
});

describe('canZoomIn', () => {
  it('is open one step short of the ceiling', () => {
    expect(canZoomIn(FONT_SIZE_CEILING_PX - 1)).toBe(true);
  });

  it('closes at the ceiling', () => {
    expect(canZoomIn(FONT_SIZE_CEILING_PX)).toBe(false);
  });
});

describe('canZoomOut', () => {
  it('is open one step above the floor', () => {
    expect(canZoomOut(FONT_SIZE_FLOOR_PX + 1)).toBe(true);
  });

  it('closes at the floor', () => {
    expect(canZoomOut(FONT_SIZE_FLOOR_PX)).toBe(false);
  });
});

describe('clampSemitoneOffset', () => {
  it('keeps an offset inside the range that changes the chart', () => {
    expect(clampSemitoneOffset(0)).toBe(0);
    expect(clampSemitoneOffset(-3)).toBe(-3);
  });

  it('stops one step short of the octave going up', () => {
    expect(clampSemitoneOffset(12)).toBe(TRANSPOSE_LIMIT_SEMITONES);
  });

  it('stops one step short of the octave going down', () => {
    expect(clampSemitoneOffset(-12)).toBe(-TRANSPOSE_LIMIT_SEMITONES);
  });
});

describe('canTransposeUp', () => {
  it('is open one semitone short of the limit', () => {
    expect(canTransposeUp(TRANSPOSE_LIMIT_SEMITONES - 1)).toBe(true);
  });

  it('closes at the limit', () => {
    expect(canTransposeUp(TRANSPOSE_LIMIT_SEMITONES)).toBe(false);
  });
});

describe('canTransposeDown', () => {
  it('is open one semitone above the limit', () => {
    expect(canTransposeDown(-TRANSPOSE_LIMIT_SEMITONES + 1)).toBe(true);
  });

  it('closes at the limit', () => {
    expect(canTransposeDown(-TRANSPOSE_LIMIT_SEMITONES)).toBe(false);
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
    expect(clampSceneScrollSpeed(0)).toBe(SCROLL_SPEED_FLOOR_PX_PER_SECOND);
  });

  it('clamps a speed faster than the ceiling', () => {
    expect(clampSceneScrollSpeed(900)).toBe(SCROLL_SPEED_CEILING_PX_PER_SECOND);
  });
});

describe('canScrollFaster', () => {
  it('is open one pixel short of the ceiling', () => {
    expect(canScrollFaster(SCROLL_SPEED_CEILING_PX_PER_SECOND - 1)).toBe(true);
  });

  it('closes at the ceiling', () => {
    expect(canScrollFaster(SCROLL_SPEED_CEILING_PX_PER_SECOND)).toBe(false);
  });
});

describe('canScrollSlower', () => {
  it('is open one pixel above the floor', () => {
    expect(canScrollSlower(SCROLL_SPEED_FLOOR_PX_PER_SECOND + 1)).toBe(true);
  });

  it('closes at the floor', () => {
    expect(canScrollSlower(SCROLL_SPEED_FLOOR_PX_PER_SECOND)).toBe(false);
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

describe('selectSceneExitPath', () => {
  it('returns to practice mode when the scene was opened from it', () => {
    expect(selectSceneExitPath('song-1', '/sessions/abc-1/practice')).toBe(
      '/sessions/abc-1/practice',
    );
  });

  it('returns to the song for anything else, so the address cannot send a reader elsewhere', () => {
    expect(selectSceneExitPath('song-1', null)).toBe('/catalog/song-1');
    expect(selectSceneExitPath('song-1', 'https://example.com')).toBe('/catalog/song-1');
    expect(selectSceneExitPath('song-1', '//evil/sessions/a/practice')).toBe('/catalog/song-1');
  });
});

describe('buildSceneAddressFromPractice', () => {
  it('carries the practice path in the back parameter', () => {
    expect(buildSceneAddressFromPractice('song-1', '/sessions/abc/practice')).toBe(
      '/catalog/song-1/scene?back=%2Fsessions%2Fabc%2Fpractice',
    );
  });
});
