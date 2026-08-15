/**
 * Decisions the stage view makes: how a zoom step lands inside the readable
 * range, and how the transpose offset is written next to the buttons. The
 * chord source it renders is read by `selectChordProText` in
 * `chart-kind.utils.ts`, which every catalog surface shares.
 */

/**
 * Twelve semitones is an octave, so `+12` renders the chart it started
 * from while the counter claims a change. The offset stops one step
 * short of the octave in both directions, which is the whole range that
 * has distinct output.
 */
export const SCENE_TRANSPOSE_MIN_SEMITONES = -11;
export const SCENE_TRANSPOSE_MAX_SEMITONES = 11;

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
