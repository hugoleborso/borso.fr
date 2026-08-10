/**
 * Decisions the stage view makes: which chord source it can render, how a
 * zoom step lands inside the readable range, and how the transpose
 * offset is written next to the buttons.
 */

export const SCENE_FONT_SIZE_MIN_PX = 16;
export const SCENE_FONT_SIZE_MAX_PX = 48;
export const SCENE_FONT_SIZE_STEP_PX = 2;
export const SCENE_FONT_SIZE_DEFAULT_PX = 24;

interface ChartLike {
  readonly kind: string;
  readonly text?: string;
}

/** Only a ChordPro chart carries the text the scene viewer can transpose. */
export function selectChordproText(chart: ChartLike | null | undefined): string | null {
  if (chart === null || chart === undefined) return null;
  if (chart.kind !== 'chordpro') return null;
  return chart.text ?? null;
}

export function clampSceneFontSize(fontSizePx: number): number {
  return Math.min(SCENE_FONT_SIZE_MAX_PX, Math.max(SCENE_FONT_SIZE_MIN_PX, fontSizePx));
}

export function formatSemitoneOffset(semitones: number): string {
  return semitones >= 0 ? `+${semitones}` : String(semitones);
}
