/**
 * Decisions the stage view makes: how a zoom step lands inside the readable
 * range, and how the transpose offset is written next to the buttons. The
 * chord source it renders is read by `selectChordProText` in
 * `chart-kind.utils.ts`, which every catalog surface shares.
 */

export const SCENE_FONT_SIZE_MIN_PX = 16;
export const SCENE_FONT_SIZE_MAX_PX = 48;
export const SCENE_FONT_SIZE_STEP_PX = 2;
export const SCENE_FONT_SIZE_DEFAULT_PX = 24;

// @FollowsBlueprint utils-pure-module
export function clampSceneFontSize(fontSizePx: number): number {
  return Math.min(SCENE_FONT_SIZE_MAX_PX, Math.max(SCENE_FONT_SIZE_MIN_PX, fontSizePx));
}

export function formatSemitoneOffset(semitones: number): string {
  return semitones >= 0 ? `+${semitones}` : String(semitones);
}
