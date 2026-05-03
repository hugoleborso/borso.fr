import type { Palette } from './palettes.utils';

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  id: number;
};

export type ColoredRect = Rect & {
  fill: string;
  fillName: string;
};

const MULBERRY32_INCREMENT = 0x6d2b79f5;
const COLORIZE_SEED_MIX = 0x9e3779b9;

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
const MAX_GENERATOR_ITERATIONS = 400;
const ASPECT_BIAS_STRENGTH = 0.25;
const SPLIT_FRACTION_JITTER = 0.12;
const AREA_WEIGHT_LARGE_RECT_BOOST = 0.5;
const SEVENTH = 1 / 7;

type SplittableEntry = { rectIndex: number; rect: Rect };

export function pickSplittableEntry(
  candidateRects: Rect[],
  nextRandom: () => number,
): SplittableEntry | null {
  type WeightedSplittable = { rectIndex: number; rect: Rect; weight: number };
  let totalWeight = 0;
  const weightedSplittables: WeightedSplittable[] = [];
  candidateRects.forEach((candidateRect, rectIndex) => {
    const isSplittable =
      candidateRect.width > MIN_RECT_DIMENSION * 2 ||
      candidateRect.height > MIN_RECT_DIMENSION * 2;
    if (!isSplittable) return;
    const longestSide = Math.max(candidateRect.width, candidateRect.height);
    const weight =
      candidateRect.width * candidateRect.height *
      (1 + AREA_WEIGHT_LARGE_RECT_BOOST * longestSide);
    weightedSplittables.push({ rectIndex, rect: candidateRect, weight });
    totalWeight += weight;
  });

  let cumulativeWeight = nextRandom() * totalWeight;
  let pickedSplittable: WeightedSplittable | null = null;
  for (const splittable of weightedSplittables) {
    pickedSplittable = splittable;
    cumulativeWeight -= splittable.weight;
    if (cumulativeWeight <= 0) break;
  }

  if (pickedSplittable === null) return null;
  return { rectIndex: pickedSplittable.rectIndex, rect: pickedSplittable.rect };
}

export function pickSplitFraction(nextRandom: () => number): number {
  const roll = nextRandom();
  if (roll < SEVENTH * 1) return 0.382;
  if (roll < SEVENTH * 2) return 0.5;
  if (roll < SEVENTH * 3) return 0.618;
  if (roll < SEVENTH * 4) return 0.333;
  if (roll < SEVENTH * 5) return 0.667;
  if (roll < SEVENTH * 6) return 0.25;
  return 0.75;
}

function chooseJitteredSplitFraction(
  rectBeingSplit: Rect,
  vertical: boolean,
  nextRandom: () => number,
): number {
  const baseFraction = pickSplitFraction(nextRandom);
  const jitteredFraction = baseFraction + (nextRandom() - 0.5) * SPLIT_FRACTION_JITTER;
  const span = vertical ? rectBeingSplit.width : rectBeingSplit.height;
  const lowerBound = MIN_RECT_DIMENSION / span;
  const upperBound = 1 - lowerBound;
  return Math.max(lowerBound, Math.min(upperBound, jitteredFraction));
}

export function generateLayout({
  seed,
  complexity,
}: {
  seed: number;
  complexity: number;
}): Rect[] {
  const nextRandom = mulberry32(seed);
  const rects: Rect[] = [{ x: 0, y: 0, width: 1, height: 1, depth: 0, id: 0 }];
  const targetCount = Math.max(MIN_TARGET_RECT_COUNT, Math.round(complexity));

  let iterationsLeft = MAX_GENERATOR_ITERATIONS;
  while (rects.length < targetCount && iterationsLeft-- > 0) {
    const splitTarget = pickSplittableEntry(rects, nextRandom);
    if (splitTarget === null) break;
    const rectBeingSplit = splitTarget.rect;
    const splitTargetIndex = splitTarget.rectIndex;

    const canSplitVertically = rectBeingSplit.width > MIN_RECT_DIMENSION * 2;
    const canSplitHorizontally = rectBeingSplit.height > MIN_RECT_DIMENSION * 2;

    let vertical: boolean;
    if (canSplitVertically && canSplitHorizontally) {
      const aspectRatio = rectBeingSplit.width / rectBeingSplit.height;
      const verticalProbability = 0.5 + ASPECT_BIAS_STRENGTH * Math.tanh(Math.log(aspectRatio));
      vertical = nextRandom() < verticalProbability;
    } else {
      vertical = canSplitVertically;
    }

    const splitFraction = chooseJitteredSplitFraction(rectBeingSplit, vertical, nextRandom);
    let firstHalf: Rect;
    let secondHalf: Rect;
    if (vertical) {
      const splitX = rectBeingSplit.x + rectBeingSplit.width * splitFraction;
      firstHalf = {
        x: rectBeingSplit.x,
        y: rectBeingSplit.y,
        width: splitX - rectBeingSplit.x,
        height: rectBeingSplit.height,
        depth: rectBeingSplit.depth + 1,
        id: 0,
      };
      secondHalf = {
        x: splitX,
        y: rectBeingSplit.y,
        width: rectBeingSplit.x + rectBeingSplit.width - splitX,
        height: rectBeingSplit.height,
        depth: rectBeingSplit.depth + 1,
        id: 0,
      };
    } else {
      const splitY = rectBeingSplit.y + rectBeingSplit.height * splitFraction;
      firstHalf = {
        x: rectBeingSplit.x,
        y: rectBeingSplit.y,
        width: rectBeingSplit.width,
        height: splitY - rectBeingSplit.y,
        depth: rectBeingSplit.depth + 1,
        id: 0,
      };
      secondHalf = {
        x: rectBeingSplit.x,
        y: splitY,
        width: rectBeingSplit.width,
        height: rectBeingSplit.y + rectBeingSplit.height - splitY,
        depth: rectBeingSplit.depth + 1,
        id: 0,
      };
    }
    rects.splice(splitTargetIndex, 1, firstHalf, secondHalf);
  }

  return rects.map((generatedRect, sequentialIndex) => ({ ...generatedRect, id: sequentialIndex }));
}

const NEUTRAL_PROBABILITY_BASE = 0.45;
const NEUTRAL_PROBABILITY_AREA_GAIN = 0.45;
const NEUTRAL_AREA_SATURATION = 4;
const NEUTRAL_BALANCE_PENALTY = 0.3;

export function colorize(
  layout: Rect[],
  { seed, palette, balance }: { seed: number; palette: Palette; balance: number },
): ColoredRect[] {
  const nextRandom = mulberry32(seed ^ COLORIZE_SEED_MIX);
  const fills = palette.fills;
  const neutralIndex = fills.findIndex(
    (fill) => fill.hex.toLowerCase() === palette.bg.toLowerCase(),
  );
  const nonNeutralFills = fills.filter((_fill, fillIndex) => fillIndex !== neutralIndex);
  const neutralFill = neutralIndex >= 0 ? fills[neutralIndex] : undefined;

  return layout.map((rectToColor) => {
    const rectArea = rectToColor.width * rectToColor.height;
    const neutralProbability =
      NEUTRAL_PROBABILITY_BASE +
      NEUTRAL_PROBABILITY_AREA_GAIN * Math.min(1, rectArea * NEUTRAL_AREA_SATURATION) -
      balance * NEUTRAL_BALANCE_PENALTY;

    const useNeutral = nextRandom() < neutralProbability;
    const chosenFill = useNeutral && neutralFill !== undefined
      ? neutralFill
      : pickUniform(nonNeutralFills, nextRandom);

    if (chosenFill === null) {
      return { ...rectToColor, fill: palette.line, fillName: 'line' };
    }
    return { ...rectToColor, fill: chosenFill.hex, fillName: chosenFill.name };
  });
}

function pickUniform<Element>(list: readonly Element[], nextRandom: () => number): Element | null {
  if (list.length === 0) return null;
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
