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
