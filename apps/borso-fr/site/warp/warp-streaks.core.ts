/**
 * The geometry of the hyperspace field drawn over the page while it leaves.
 *
 * Every streak is resolved to plain numbers here, before any element exists,
 * so the browser edge module writes values onto a node and the look of the
 * jump stays testable by calling a function with a scripted generator.
 *
 * Distances are in `vmax` so the field reaches the corner of any viewport, and
 * the colours are the `--color-warp-*` custom properties declared in
 * `site/styles/tokens.css` rather than a second copy of the hex.
 */

export interface WarpStreak {
  readonly angleDegrees: number;
  readonly startDistanceVmax: number;
  readonly endDistanceVmax: number;
  readonly lengthVmax: number;
  readonly thicknessPixels: number;
  readonly durationMilliseconds: number;
  readonly delayMilliseconds: number;
  readonly color: string;
}

/** How long the page holds still after the click, flash included, before it is replaced. */
export const WARP_DURATION_MILLISECONDS = 820;

/** Enough trails to read as a field at 1280px without asking the compositor for a thousand layers. */
export const WARP_STREAK_COUNT = 96;

const FULL_TURN_DEGREES = 360;
const START_DISTANCE_BASE_VMAX = 3;
const START_DISTANCE_SPAN_VMAX = 9;
const TRAVEL_DISTANCE_BASE_VMAX = 55;
const TRAVEL_DISTANCE_SPAN_VMAX = 65;
const LENGTH_BASE_VMAX = 5;
const LENGTH_SPAN_VMAX = 24;
const THICKNESS_BASE_PIXELS = 1;
const THICKNESS_SPAN_PIXELS = 1.8;
const DURATION_BASE_MILLISECONDS = 260;
const DURATION_SPAN_MILLISECONDS = 260;
const DELAY_SPAN_MILLISECONDS = 560;

const CORE_COLOR = 'var(--color-warp-core)';
const GLOW_COLOR = 'var(--color-warp-glow)';
const EMBER_COLOR = 'var(--color-warp-ember)';

/** A few embers among the white and the periwinkle, which is what stops the field reading as static. */
const EMBER_SHARE = 0.12;
const GLOW_SHARE = 0.55;

export function selectStreakColor(drawnValue: number): string {
  if (drawnValue < EMBER_SHARE) return EMBER_COLOR;
  if (drawnValue < GLOW_SHARE) return GLOW_COLOR;
  return CORE_COLOR;
}

const HUNDREDTHS = 100;

function roundToHundredths(value: number): number {
  return Math.round(value * HUNDREDTHS) / HUNDREDTHS;
}

function buildStreak(nextRandom: () => number): WarpStreak {
  const startDistanceVmax = START_DISTANCE_BASE_VMAX + nextRandom() * START_DISTANCE_SPAN_VMAX;
  const travelDistanceVmax = TRAVEL_DISTANCE_BASE_VMAX + nextRandom() * TRAVEL_DISTANCE_SPAN_VMAX;
  return {
    angleDegrees: roundToHundredths(nextRandom() * FULL_TURN_DEGREES),
    startDistanceVmax: roundToHundredths(startDistanceVmax),
    endDistanceVmax: roundToHundredths(startDistanceVmax + travelDistanceVmax),
    lengthVmax: roundToHundredths(LENGTH_BASE_VMAX + nextRandom() * LENGTH_SPAN_VMAX),
    thicknessPixels: roundToHundredths(
      THICKNESS_BASE_PIXELS + nextRandom() * THICKNESS_SPAN_PIXELS,
    ),
    durationMilliseconds: Math.round(
      DURATION_BASE_MILLISECONDS + nextRandom() * DURATION_SPAN_MILLISECONDS,
    ),
    delayMilliseconds: Math.round(nextRandom() * DELAY_SPAN_MILLISECONDS),
    color: selectStreakColor(nextRandom()),
  };
}

export function buildWarpStreaks(
  streakCount: number,
  nextRandom: () => number,
): readonly WarpStreak[] {
  return Array.from({ length: streakCount }, () => buildStreak(nextRandom));
}

/**
 * The custom properties the keyframes in `tokens.css` read, plus the two
 * animation values that differ per streak. The edge module writes every entry
 * onto the element with `setProperty`, so a new value is one line here.
 */
export function selectStreakStyleProperties(streak: WarpStreak): Readonly<Record<string, string>> {
  return {
    '--warp-angle': `${streak.angleDegrees}deg`,
    '--warp-start': `${streak.startDistanceVmax}vmax`,
    '--warp-end': `${streak.endDistanceVmax}vmax`,
    '--warp-length': `${streak.lengthVmax}vmax`,
    '--warp-thickness': `${streak.thicknessPixels}px`,
    '--warp-color': streak.color,
    'animation-duration': `${streak.durationMilliseconds}ms`,
    'animation-delay': `${streak.delayMilliseconds}ms`,
  };
}

/** The veil and the flash both last the whole jump, so both are written from the same constant. */
export function selectJumpStyleProperties(): Readonly<Record<string, string>> {
  return { 'animation-duration': `${WARP_DURATION_MILLISECONDS}ms` };
}
