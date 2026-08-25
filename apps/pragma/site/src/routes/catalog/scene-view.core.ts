/** @Feature songs */

const SEMITONES_IN_OCTAVE = 12;
const DISTINCT_TRANSPOSE_STEPS_PER_DIRECTION = SEMITONES_IN_OCTAVE - 1;

export const SCENE_TRANSPOSE_MIN_SEMITONES = -DISTINCT_TRANSPOSE_STEPS_PER_DIRECTION;
export const SCENE_TRANSPOSE_MAX_SEMITONES = DISTINCT_TRANSPOSE_STEPS_PER_DIRECTION;

export const SCENE_FONT_SIZE_MIN_PX = 16;
export const SCENE_FONT_SIZE_MAX_PX = 48;
export const SCENE_FONT_SIZE_STEP_PX = 2;
export const SCENE_FONT_SIZE_DEFAULT_PX = 24;

// @FollowsBlueprint utils-pure-module
export function clampSceneFontSize(fontSizePx: number): number {
  return Math.min(SCENE_FONT_SIZE_MAX_PX, Math.max(SCENE_FONT_SIZE_MIN_PX, fontSizePx));
}

export function clampSemitoneOffset(semitones: number): number {
  return Math.min(
    SCENE_TRANSPOSE_MAX_SEMITONES,
    Math.max(SCENE_TRANSPOSE_MIN_SEMITONES, semitones),
  );
}

export function formatSemitoneOffset(semitones: number): string {
  return semitones >= 0 ? `+${semitones}` : String(semitones);
}

export const SCENE_SCROLL_SPEED_MIN_PX_PER_SECOND = 10;
export const SCENE_SCROLL_SPEED_MAX_PX_PER_SECOND = 120;
export const SCENE_SCROLL_SPEED_STEP_PX_PER_SECOND = 10;
export const SCENE_SCROLL_SPEED_DEFAULT_PX_PER_SECOND = 30;

const MILLISECONDS_IN_SECOND = 1000;

export function clampSceneScrollSpeed(pixelsPerSecond: number): number {
  return Math.min(
    SCENE_SCROLL_SPEED_MAX_PX_PER_SECOND,
    Math.max(SCENE_SCROLL_SPEED_MIN_PX_PER_SECOND, pixelsPerSecond),
  );
}

export function computeScrollStepPx(pixelsPerSecond: number, tickMs: number): number {
  return (pixelsPerSecond * tickMs) / MILLISECONDS_IN_SECOND;
}
