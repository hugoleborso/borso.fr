import type { TranslationKey } from '../../i18n/i18n.utils';
import type { Palette, PaletteFill } from './palettes.utils';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  id: number;
}

export type ColoredRect = Rect & {
  fill: string;
  fillNameKey: TranslationKey;
};

const MULBERRY32_INCREMENT = 0x6d2b79f5;
const COLORIZE_SEED_MIX = 0x9e3779b9;

/**
 * @Blueprint utils-seeded-generator
 * @BlueprintName Seeded Generator Utility
 * @BlueprintUsage Use for generative code, so that a module which draws random numbers still lives inside the purity gate.
 * @BlueprintDescription Turns a seed into a draw function that every generator in the module then takes as an argument, so the randomness arrives as a parameter and `Math.random` is never called here. The same seed always produces the same sequence and therefore the same picture, which is what lets the sibling test assert on exact output and what makes a composition shareable as a URL.
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + MULBERRY32_INCREMENT) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

const MIN_RECT_DIMENSION = 0.06;
const MIN_TARGET_RECT_COUNT = 4;
const ASPECT_BIAS_STRENGTH = 0.25;
const UNBIASED_PROBABILITY = 0.5;
const SPLIT_FRACTION_JITTER = 0.12;
const JITTER_MIDPOINT = 0.5;
const AREA_WEIGHT_LARGE_RECT_BOOST = 0.5;
const CHILD_DEPTH_STEP = 1;
const UNNUMBERED_RECT_ID = 0;

function isSpanSplittable(span: number): boolean {
  return span > MIN_RECT_DIMENSION * 2;
}

export function isSplittable(rect: Rect): boolean {
  return isSpanSplittable(rect.width) || isSpanSplittable(rect.height);
}

/**
 * Area, biased towards the rectangle with the longest side, so a wide band gets
 * broken up before a small square already boxed in by lines.
 */
export function computeSplitWeight(rect: Rect): number {
  const longestSide = Math.max(rect.width, rect.height);
  return rect.width * rect.height * (1 + AREA_WEIGHT_LARGE_RECT_BOOST * longestSide);
}

interface SplittableEntry {
  rectIndex: number;
  rect: Rect;
}

export function pickSplittableEntry(
  candidateRects: readonly Rect[],
  nextRandom: () => number,
): SplittableEntry | null {
  interface WeightedSplittable extends SplittableEntry {
    weight: number;
  }
  let totalWeight = 0;
  const weightedSplittables: WeightedSplittable[] = [];
  candidateRects.forEach((candidateRect, rectIndex) => {
    if (!isSplittable(candidateRect)) return;
    const weight = computeSplitWeight(candidateRect);
    weightedSplittables.push({ rectIndex, rect: candidateRect, weight });
    totalWeight += weight;
  });

  let remainingWeight = nextRandom() * totalWeight;
  let pickedSplittable: WeightedSplittable | null = null;
  for (const splittable of weightedSplittables) {
    pickedSplittable = splittable;
    remainingWeight -= splittable.weight;
    if (remainingWeight <= 0) break;
  }

  if (pickedSplittable === null) return null;
  return { rectIndex: pickedSplittable.rectIndex, rect: pickedSplittable.rect };
}

/**
 * The golden section and its neighbours. Each fraction owns an equal slice of
 * the unit interval, so a draw picks one by its index instead of walking a
 * chain of thresholds.
 */
const SPLIT_FRACTIONS: readonly number[] = [0.382, 0.5, 0.618, 0.333, 0.667, 0.25, 0.75];
const LAST_SPLIT_FRACTION = 0.75;

export function pickSplitFraction(nextRandom: () => number): number {
  const sliceIndex = Math.floor(nextRandom() * SPLIT_FRACTIONS.length);
  return SPLIT_FRACTIONS[sliceIndex] ?? LAST_SPLIT_FRACTION;
}

/**
 * True cuts the rectangle down a vertical line. A rectangle too small along one
 * axis can only be cut along the other; when both are open, the wider the
 * rectangle, the likelier the cut is vertical.
 */
export function shouldSplitVertically(rect: Rect, nextRandom: () => number): boolean {
  const canSplitVertically = isSpanSplittable(rect.width);
  const canSplitHorizontally = isSpanSplittable(rect.height);
  if (!canSplitVertically || !canSplitHorizontally) return canSplitVertically;
  const aspectRatio = rect.width / rect.height;
  const verticalProbability =
    UNBIASED_PROBABILITY + ASPECT_BIAS_STRENGTH * Math.tanh(Math.log(aspectRatio));
  return nextRandom() < verticalProbability;
}

/**
 * Draws a split fraction, nudges it off the canonical value so the painting
 * does not read as a grid, then pulls it back inside the range that leaves both
 * halves at least `MIN_RECT_DIMENSION` across.
 */
export function chooseJitteredSplitFraction(
  rectBeingSplit: Rect,
  isVertical: boolean,
  nextRandom: () => number,
): number {
  const baseFraction = pickSplitFraction(nextRandom);
  const jitteredFraction = baseFraction + (nextRandom() - JITTER_MIDPOINT) * SPLIT_FRACTION_JITTER;
  const span = isVertical ? rectBeingSplit.width : rectBeingSplit.height;
  const lowerBound = MIN_RECT_DIMENSION / span;
  const upperBound = 1 - lowerBound;
  return Math.max(lowerBound, Math.min(upperBound, jitteredFraction));
}

/**
 * The halves meet at an absolute coordinate rather than at two independently
 * scaled widths, so the second one starts exactly where the first one ends and
 * the pair still tiles the parent to the last bit.
 */
export function splitRect(
  rectBeingSplit: Rect,
  isVertical: boolean,
  splitFraction: number,
): readonly [Rect, Rect] {
  const childDepth = rectBeingSplit.depth + CHILD_DEPTH_STEP;
  if (isVertical) {
    const splitX = rectBeingSplit.x + rectBeingSplit.width * splitFraction;
    return [
      {
        x: rectBeingSplit.x,
        y: rectBeingSplit.y,
        width: splitX - rectBeingSplit.x,
        height: rectBeingSplit.height,
        depth: childDepth,
        id: UNNUMBERED_RECT_ID,
      },
      {
        x: splitX,
        y: rectBeingSplit.y,
        width: rectBeingSplit.x + rectBeingSplit.width - splitX,
        height: rectBeingSplit.height,
        depth: childDepth,
        id: UNNUMBERED_RECT_ID,
      },
    ];
  }
  const splitY = rectBeingSplit.y + rectBeingSplit.height * splitFraction;
  return [
    {
      x: rectBeingSplit.x,
      y: rectBeingSplit.y,
      width: rectBeingSplit.width,
      height: splitY - rectBeingSplit.y,
      depth: childDepth,
      id: UNNUMBERED_RECT_ID,
    },
    {
      x: rectBeingSplit.x,
      y: splitY,
      width: rectBeingSplit.width,
      height: rectBeingSplit.y + rectBeingSplit.height - splitY,
      depth: childDepth,
      id: UNNUMBERED_RECT_ID,
    },
  ];
}

/**
 * A composition is a seed and a rectangle count: the same pair paints the same
 * canvas forever, because that pair is what a shared URL carries.
 *
 * The loop ends on its own even when the count asked for is unreachable. Every
 * cut leaves both halves at least `MIN_RECT_DIMENSION` across, so the unit
 * canvas holds a bounded number of rectangles, and past that
 * `pickSplittableEntry` finds nothing left to cut.
 */
export function generateLayout({ seed, complexity }: { seed: number; complexity: number }): Rect[] {
  const nextRandom = mulberry32(seed);
  const rects: Rect[] = [{ x: 0, y: 0, width: 1, height: 1, depth: 0, id: UNNUMBERED_RECT_ID }];
  const targetCount = Math.max(MIN_TARGET_RECT_COUNT, Math.round(complexity));

  while (rects.length < targetCount) {
    const splitTarget = pickSplittableEntry(rects, nextRandom);
    if (splitTarget === null) break;
    const isVertical = shouldSplitVertically(splitTarget.rect, nextRandom);
    const splitFraction = chooseJitteredSplitFraction(splitTarget.rect, isVertical, nextRandom);
    const halves = splitRect(splitTarget.rect, isVertical, splitFraction);
    rects.splice(splitTarget.rectIndex, 1, halves[0], halves[1]);
  }

  return rects.map((generatedRect, sequentialIndex) => ({ ...generatedRect, id: sequentialIndex }));
}

const NEUTRAL_PROBABILITY_BASE = 0.45;
const NEUTRAL_PROBABILITY_AREA_GAIN = 0.45;
const NEUTRAL_AREA_SATURATION = 4;
const NEUTRAL_BALANCE_PENALTY = 0.3;
const FULL_AREA_SHARE = 1;

/**
 * How likely a rectangle of this area is to be left the colour of the paper. A
 * large rectangle stays neutral more often than a small one, and raising the
 * balance turns more of them into colour.
 */
export function selectNeutralProbability(rectArea: number, balance: number): number {
  return (
    NEUTRAL_PROBABILITY_BASE +
    NEUTRAL_PROBABILITY_AREA_GAIN * Math.min(FULL_AREA_SHARE, rectArea * NEUTRAL_AREA_SATURATION) -
    balance * NEUTRAL_BALANCE_PENALTY
  );
}

export function isNeutralDraw(draw: number, rectArea: number, balance: number): boolean {
  return draw < selectNeutralProbability(rectArea, balance);
}

export interface PaletteSplit {
  neutralFill: PaletteFill | undefined;
  nonNeutralFills: readonly PaletteFill[];
}

/**
 * Separates the one fill that matches the paper from the rest. The preset
 * palettes repeat a fill to weight it and only the first match counts as the
 * neutral, so a repeated paper colour stays in the draw as a colour.
 */
export function splitPaletteFills(palette: Palette): PaletteSplit {
  const neutralHex = palette.bg.toLowerCase();
  const neutralIndex = palette.fills.findIndex((fill) => fill.hex.toLowerCase() === neutralHex);
  return {
    neutralFill: palette.fills[neutralIndex],
    nonNeutralFills: palette.fills.filter((_fill, fillIndex) => fillIndex !== neutralIndex),
  };
}

const LINE_FILL_NAME_KEY: TranslationKey = 'mondrian.colour.ink';

export function colorize(
  layout: readonly Rect[],
  { seed, palette, balance }: { seed: number; palette: Palette; balance: number },
): ColoredRect[] {
  const nextRandom = mulberry32(seed ^ COLORIZE_SEED_MIX);
  const { neutralFill, nonNeutralFills } = splitPaletteFills(palette);

  return layout.map((rectToColor) => {
    const rectArea = rectToColor.width * rectToColor.height;
    const isUseNeutral = isNeutralDraw(nextRandom(), rectArea, balance);
    const chosenFill =
      isUseNeutral && neutralFill !== undefined
        ? neutralFill
        : pickUniform(nonNeutralFills, nextRandom);

    if (chosenFill === null) {
      return { ...rectToColor, fill: palette.line, fillNameKey: LINE_FILL_NAME_KEY };
    }
    return { ...rectToColor, fill: chosenFill.hex, fillNameKey: chosenFill.nameKey };
  });
}

export function pickUniform<Element>(
  list: readonly Element[],
  nextRandom: () => number,
): Element | null {
  const targetIndex = Math.floor(nextRandom() * list.length);
  let pickedElement: Element | null = null;
  let cursor = 0;
  for (const element of list) {
    if (cursor === targetIndex) {
      pickedElement = element;
      break;
    }
    cursor++;
  }
  return pickedElement;
}
