import type { Palette } from './palettes';

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
const SPLIT_FRACTION_CHOICES = [0.382, 0.5, 0.618, 0.333, 0.667, 0.25, 0.75];
const SPLIT_FRACTION_JITTER = 0.12;
const AREA_WEIGHT_LARGE_RECT_BOOST = 0.5;

function pickSplittableRectIndex(
  rects: Rect[],
  nextRandom: () => number,
): number | null {
  let totalWeight = 0;
  const weights = rects.map((rect) => {
    const isSplittable =
      rect.width > MIN_RECT_DIMENSION * 2 || rect.height > MIN_RECT_DIMENSION * 2;
    if (!isSplittable) return 0;
    const longestSide = Math.max(rect.width, rect.height);
    const weight = rect.width * rect.height * (1 + AREA_WEIGHT_LARGE_RECT_BOOST * longestSide);
    totalWeight += weight;
    return weight;
  });
  if (totalWeight === 0) return null;

  let remaining = nextRandom() * totalWeight;
  for (let i = 0; i < weights.length; i++) {
    remaining -= weights[i] ?? 0;
    if (remaining <= 0) return i;
  }
  return weights.length - 1;
}

function chooseSplitFraction(
  rect: Rect,
  vertical: boolean,
  nextRandom: () => number,
): number {
  const choiceIndex = Math.floor(nextRandom() * SPLIT_FRACTION_CHOICES.length);
  const baseFraction = SPLIT_FRACTION_CHOICES[choiceIndex] ?? 0.5;
  const jittered = baseFraction + (nextRandom() - 0.5) * SPLIT_FRACTION_JITTER;
  const span = vertical ? rect.width : rect.height;
  const lowerBound = MIN_RECT_DIMENSION / span;
  const upperBound = 1 - lowerBound;
  return Math.max(lowerBound, Math.min(upperBound, jittered));
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
    const pickedIndex = pickSplittableRectIndex(rects, nextRandom);
    if (pickedIndex === null) break;
    const current = rects[pickedIndex];
    if (!current) break;

    const canSplitVertically = current.width > MIN_RECT_DIMENSION * 2;
    const canSplitHorizontally = current.height > MIN_RECT_DIMENSION * 2;
    if (!canSplitVertically && !canSplitHorizontally) {
      rects.splice(pickedIndex, 1);
      rects.push(current);
      continue;
    }

    let vertical: boolean;
    if (canSplitVertically && canSplitHorizontally) {
      const aspectRatio = current.width / current.height;
      const verticalProbability = 0.5 + ASPECT_BIAS_STRENGTH * Math.tanh(Math.log(aspectRatio));
      vertical = nextRandom() < verticalProbability;
    } else {
      vertical = canSplitVertically;
    }

    const splitFraction = chooseSplitFraction(current, vertical, nextRandom);
    let firstHalf: Rect;
    let secondHalf: Rect;
    if (vertical) {
      const splitX = current.x + current.width * splitFraction;
      firstHalf = {
        x: current.x,
        y: current.y,
        width: splitX - current.x,
        height: current.height,
        depth: current.depth + 1,
        id: 0,
      };
      secondHalf = {
        x: splitX,
        y: current.y,
        width: current.x + current.width - splitX,
        height: current.height,
        depth: current.depth + 1,
        id: 0,
      };
    } else {
      const splitY = current.y + current.height * splitFraction;
      firstHalf = {
        x: current.x,
        y: current.y,
        width: current.width,
        height: splitY - current.y,
        depth: current.depth + 1,
        id: 0,
      };
      secondHalf = {
        x: current.x,
        y: splitY,
        width: current.width,
        height: current.y + current.height - splitY,
        depth: current.depth + 1,
        id: 0,
      };
    }
    rects.splice(pickedIndex, 1, firstHalf, secondHalf);
  }

  return rects.map((rect, index) => ({ ...rect, id: index }));
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
  return layout.map((rect) => {
    const area = rect.width * rect.height;
    const neutralProbability =
      NEUTRAL_PROBABILITY_BASE +
      NEUTRAL_PROBABILITY_AREA_GAIN * Math.min(1, area * NEUTRAL_AREA_SATURATION) -
      balance * NEUTRAL_BALANCE_PENALTY;

    const useNeutral = nextRandom() < neutralProbability;
    let fillIndex: number;
    if (useNeutral && neutralIndex >= 0) {
      fillIndex = neutralIndex;
    } else {
      const candidates: number[] = [];
      for (let candidate = 0; candidate < fills.length; candidate++) {
        if (candidate !== neutralIndex) candidates.push(candidate);
      }
      fillIndex = candidates[Math.floor(nextRandom() * candidates.length)] ?? 0;
    }
    const chosenFill = fills[fillIndex];
    if (!chosenFill) {
      return { ...rect, fill: palette.line, fillName: 'line' };
    }
    return { ...rect, fill: chosenFill.hex, fillName: chosenFill.name };
  });
}
