/** @Feature songs */

const SCENE_TRANSPOSE_LIMIT_SEMITONES = 11;

const SCENE_FONT_SIZE_MIN_PX = 16;
const SCENE_FONT_SIZE_MAX_PX = 48;
export const SCENE_FONT_SIZE_STEP_PX = 2;
export const SCENE_FONT_SIZE_DEFAULT_PX = 24;

const SCENE_SCROLL_SPEED_MIN_PX_PER_SECOND = 10;
const SCENE_SCROLL_SPEED_MAX_PX_PER_SECOND = 120;
export const SCENE_SCROLL_SPEED_STEP_PX_PER_SECOND = 10;
export const SCENE_SCROLL_SPEED_DEFAULT_PX_PER_SECOND = 30;

const MILLISECONDS_IN_SECOND = 1000;

// @FollowsBlueprint utils-pure-module
export function clampSceneFontSize(fontSizePx: number): number {
  return Math.min(SCENE_FONT_SIZE_MAX_PX, Math.max(SCENE_FONT_SIZE_MIN_PX, fontSizePx));
}

export function canZoomIn(fontSizePx: number): boolean {
  return fontSizePx < SCENE_FONT_SIZE_MAX_PX;
}

export function canZoomOut(fontSizePx: number): boolean {
  return fontSizePx > SCENE_FONT_SIZE_MIN_PX;
}

export function clampSemitoneOffset(semitones: number): number {
  return Math.min(
    SCENE_TRANSPOSE_LIMIT_SEMITONES,
    Math.max(-SCENE_TRANSPOSE_LIMIT_SEMITONES, semitones),
  );
}

export function canTransposeUp(semitones: number): boolean {
  return semitones < SCENE_TRANSPOSE_LIMIT_SEMITONES;
}

export function canTransposeDown(semitones: number): boolean {
  return semitones > -SCENE_TRANSPOSE_LIMIT_SEMITONES;
}

export function formatSemitoneOffset(semitones: number): string {
  return semitones >= 0 ? `+${semitones}` : String(semitones);
}

export function clampSceneScrollSpeed(pixelsPerSecond: number): number {
  return Math.min(
    SCENE_SCROLL_SPEED_MAX_PX_PER_SECOND,
    Math.max(SCENE_SCROLL_SPEED_MIN_PX_PER_SECOND, pixelsPerSecond),
  );
}

export function canScrollFaster(pixelsPerSecond: number): boolean {
  return pixelsPerSecond < SCENE_SCROLL_SPEED_MAX_PX_PER_SECOND;
}

export function canScrollSlower(pixelsPerSecond: number): boolean {
  return pixelsPerSecond > SCENE_SCROLL_SPEED_MIN_PX_PER_SECOND;
}

export function computeScrollStepPx(pixelsPerSecond: number, tickMs: number): number {
  return (pixelsPerSecond * tickMs) / MILLISECONDS_IN_SECOND;
}
