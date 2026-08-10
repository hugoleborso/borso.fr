import { describe, expect, it } from 'vitest';
import {
  chooseJitteredSplitFraction,
  colorize,
  computeSplitWeight,
  generateLayout,
  isNeutralDraw,
  isSplittable,
  mulberry32,
  pickSplitFraction,
  pickSplittableEntry,
  pickUniform,
  selectNeutralProbability,
  shouldSplitVertically,
  splitPaletteFills,
  splitRect,
} from './painting.utils';
import { type Palette, PALETTES } from './palettes.utils';

const drawLow = (): number => 0.001;
const drawHigh = (): number => 0.999;

/** A generator that hands out the listed draws in order, so a test can aim one. */
function scriptedDraws(draws: readonly number[]): () => number {
  let drawIndex = 0;
  return () => draws[drawIndex++] ?? 0;
}

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  id: number;
}

function rectOf(overrides: Partial<Rectangle> = {}): Rectangle {
  return { x: 0, y: 0, width: 0.5, height: 0.5, depth: 0, id: 0, ...overrides };
}

const SAMPLE_SEED = 0x9bd1c87f;

/** Half the shortest span that can be cut in two, i.e. the smallest rectangle. */
const MIN_RECT_DIMENSION = 0.06;
const MIN_SPLITTABLE_SPAN = MIN_RECT_DIMENSION * 2;
/** Repeated cuts drift a coordinate by a few units in the last place. */
const FLOAT_DRIFT = 1e-9;

describe('mulberry32', () => {
  it('is deterministic for a fixed seed', () => {
    const firstStream = mulberry32(0x1234);
    const secondStream = mulberry32(0x1234);
    const firstSequence = Array.from({ length: 10 }, firstStream);
    const secondSequence = Array.from({ length: 10 }, secondStream);
    expect(firstSequence).toStrictEqual(secondSequence);
  });

  it('produces the same reference sequence it has always produced', () => {
    expect(Array.from({ length: 4 }, mulberry32(0x1234))).toStrictEqual([
      0.5445726229809225, 0.8161922292783856, 0.06448804796673357, 0.9422975336201489,
    ]);
    expect(Array.from({ length: 3 }, mulberry32(1))).toStrictEqual([
      0.6270739405881613, 0.002735721180215478, 0.5274470399599522,
    ]);
  });

  it('produces different streams for different seeds', () => {
    const seedA = mulberry32(1);
    const seedB = mulberry32(2);
    const sequenceA = Array.from({ length: 10 }, seedA);
    const sequenceB = Array.from({ length: 10 }, seedB);
    expect(sequenceA).not.toStrictEqual(sequenceB);
  });

  it('returns values in [0, 1)', () => {
    const stream = mulberry32(99);
    for (let drawIndex = 0; drawIndex < 1000; drawIndex++) {
      const value = stream();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('is approximately uniform across the unit interval', () => {
    const stream = mulberry32(7);
    const buckets = [0, 0, 0, 0];
    const totalDraws = 4000;
    for (let drawIndex = 0; drawIndex < totalDraws; drawIndex++) {
      const value = stream();
      const bucketIndex = Math.min(3, Math.floor(value * 4));
      const bucketCount = buckets[bucketIndex] ?? 0;
      buckets[bucketIndex] = bucketCount + 1;
    }
    for (const bucketCount of buckets) {
      expect(bucketCount).toBeGreaterThan(totalDraws / 4 - totalDraws / 10);
      expect(bucketCount).toBeLessThan(totalDraws / 4 + totalDraws / 10);
    }
  });
});

describe('isSplittable', () => {
  it('splits a rectangle that is wide enough even when it is flat', () => {
    expect(isSplittable(rectOf({ width: 0.5, height: 0.05 }))).toBe(true);
  });

  it('splits a rectangle that is tall enough even when it is narrow', () => {
    expect(isSplittable(rectOf({ width: 0.05, height: 0.5 }))).toBe(true);
  });

  it('leaves a rectangle too small on both axes alone', () => {
    expect(isSplittable(rectOf({ width: 0.05, height: 0.05 }))).toBe(false);
  });

  it('leaves a rectangle exactly two minimum dimensions across alone', () => {
    expect(isSplittable(rectOf({ width: MIN_SPLITTABLE_SPAN, height: MIN_SPLITTABLE_SPAN }))).toBe(
      false,
    );
  });

  it('splits a rectangle a hair over two minimum dimensions across', () => {
    expect(
      isSplittable(rectOf({ width: MIN_SPLITTABLE_SPAN + 0.001, height: MIN_SPLITTABLE_SPAN })),
    ).toBe(true);
  });
});

describe('computeSplitWeight', () => {
  it('weighs a rectangle by its area, boosted by its longest side', () => {
    expect(computeSplitWeight(rectOf({ width: 0.5, height: 0.25 }))).toBe(0.15625);
  });

  it('weighs a square by the side it shares', () => {
    expect(computeSplitWeight(rectOf({ width: 0.5, height: 0.5 }))).toBe(0.3125);
  });

  it('reads the longest side the same way whichever axis carries it', () => {
    expect(computeSplitWeight(rectOf({ width: 0.25, height: 0.5 }))).toBe(0.15625);
  });
});

describe('pickSplittableEntry', () => {
  const leftHalf = rectOf({ x: 0, width: 0.5, height: 0.5, id: 0 });
  const rightHalf = rectOf({ x: 0.5, width: 0.5, height: 0.5, id: 1 });

  it('returns null when every rect is below the splittable threshold', () => {
    const tinyRects = [
      rectOf({ width: 0.05, height: 0.05, id: 0 }),
      rectOf({ x: 0.5, width: 0.05, height: 0.05, id: 1 }),
    ];
    const stream = mulberry32(1);
    expect(pickSplittableEntry(tinyRects, stream)).toBeNull();
  });

  it('returns null when given an empty rect array', () => {
    expect(pickSplittableEntry([], mulberry32(1))).toBeNull();
  });

  it('returns a splittable rect when at least one is large enough', () => {
    const mixedRects = [
      rectOf({ width: 0.05, height: 0.05, id: 0 }),
      rectOf({ x: 0.5, width: 0.5, height: 0.5, id: 1 }),
    ];
    const splitTarget = pickSplittableEntry(mixedRects, mulberry32(1));
    expect(splitTarget).not.toBeNull();
    expect(splitTarget?.rectIndex).toBe(1);
  });

  it('breaks early on the first matching rect (covers cumulative-weight branch)', () => {
    const rectsTwoLarge = [
      rectOf({ width: 0.4, height: 0.4, id: 0 }),
      rectOf({ x: 0.4, width: 0.6, height: 1, id: 1 }),
    ];
    const splitTarget = pickSplittableEntry(rectsTwoLarge, drawLow);
    expect(splitTarget).not.toBeNull();
    expect(splitTarget?.rectIndex).toBe(0);
  });

  it('continues past earlier rects when cumulative weight has not been reached', () => {
    const rectsTwoLarge = [
      rectOf({ width: 0.4, height: 0.4, id: 0 }),
      rectOf({ x: 0.4, width: 0.6, height: 1, id: 1 }),
    ];
    const splitTarget = pickSplittableEntry(rectsTwoLarge, drawHigh);
    expect(splitTarget).not.toBeNull();
    expect(splitTarget?.rectIndex).toBe(1);
  });

  it('gives each rect a slice of the draw in proportion to its weight', () => {
    expect(pickSplittableEntry([leftHalf, rightHalf], () => 0.6)?.rectIndex).toBe(1);
  });

  it('gives a rect the exact end of its own slice, not the start of the next one', () => {
    const halfwayThroughTwoEqualWeights = 0.5;
    expect(
      pickSplittableEntry([leftHalf, rightHalf], () => halfwayThroughTwoEqualWeights),
    ).toStrictEqual({ rectIndex: 0, rect: leftHalf });
  });
});

describe('pickSplitFraction', () => {
  it.each([
    { sliceStart: 0 / 7, expected: 0.382 },
    { sliceStart: 1 / 7, expected: 0.5 },
    { sliceStart: 2 / 7, expected: 0.618 },
    { sliceStart: 3 / 7, expected: 0.333 },
    { sliceStart: 4 / 7, expected: 0.667 },
    { sliceStart: 5 / 7, expected: 0.25 },
    { sliceStart: 6 / 7, expected: 0.75 },
  ])('a draw landing on $sliceStart opens the slice of $expected', ({ sliceStart, expected }) => {
    expect(pickSplitFraction(() => sliceStart)).toBe(expected);
  });

  it.each([
    { drawValue: 1 / 7 - Number.EPSILON, expected: 0.382 },
    { drawValue: 6 / 7 - Number.EPSILON, expected: 0.25 },
  ])('a draw a hair below $drawValue still reads $expected', ({ drawValue, expected }) => {
    expect(pickSplitFraction(() => drawValue)).toBe(expected);
  });

  it('falls back to the last fraction for a draw at the very top of the interval', () => {
    expect(pickSplitFraction(() => 1)).toBe(0.75);
  });
});

describe('shouldSplitVertically', () => {
  const square = rectOf({ width: 0.5, height: 0.5 });
  const wide = rectOf({ width: 0.8, height: 0.2 });
  const tall = rectOf({ width: 0.2, height: 0.8 });

  it('cuts a square vertically for a draw below the even split', () => {
    expect(shouldSplitVertically(square, () => 0.49)).toBe(true);
  });

  it('cuts a square horizontally for a draw sitting exactly on the even split', () => {
    expect(shouldSplitVertically(square, () => 0.5)).toBe(false);
  });

  it('leans a wide rectangle towards a vertical cut', () => {
    expect(shouldSplitVertically(wide, () => 0.5)).toBe(true);
  });

  it('still cuts a wide rectangle horizontally once the draw passes its bias', () => {
    expect(shouldSplitVertically(wide, () => 0.75)).toBe(false);
  });

  it('leans a tall rectangle towards a horizontal cut', () => {
    expect(shouldSplitVertically(tall, () => 0.5)).toBe(false);
  });

  it('cuts a rectangle too flat to divide horizontally down its only open axis', () => {
    const flat = rectOf({ width: 0.5, height: 0.05 });
    expect(shouldSplitVertically(flat, () => 0.9)).toBe(true);
  });

  it('cuts a rectangle too narrow to divide vertically across its only open axis', () => {
    const narrow = rectOf({ width: 0.05, height: 0.5 });
    expect(shouldSplitVertically(narrow, () => 0.1)).toBe(false);
  });
});

describe('chooseJitteredSplitFraction', () => {
  const drawOpeningTheHalfSlice = 1 / 7;
  const drawOpeningTheQuarterSlice = 5 / 7;
  const drawOpeningTheThreeQuarterSlice = 6 / 7;

  it('nudges the drawn fraction by the jitter the second draw asks for', () => {
    const wide = rectOf({ width: 0.5, height: 0.2 });
    const fraction = chooseJitteredSplitFraction(
      wide,
      true,
      scriptedDraws([drawOpeningTheHalfSlice, 1]),
    );
    expect(fraction).toBe(0.56);
  });

  it('leaves the jittered fraction alone when both halves stay wide enough', () => {
    const narrow = rectOf({ width: 0.2, height: 0.5 });
    const fraction = chooseJitteredSplitFraction(
      narrow,
      false,
      scriptedDraws([drawOpeningTheQuarterSlice, 0]),
    );
    expect(fraction).toBe(0.19);
  });

  it('pulls a fraction that would leave a sliver on the left up to the minimum', () => {
    const narrow = rectOf({ width: 0.2, height: 0.5 });
    const fraction = chooseJitteredSplitFraction(
      narrow,
      true,
      scriptedDraws([drawOpeningTheQuarterSlice, 0]),
    );
    expect(fraction).toBe(0.3);
  });

  it('pulls a fraction that would leave a sliver on the right down to the maximum', () => {
    const narrow = rectOf({ width: 0.2, height: 0.5 });
    const fraction = chooseJitteredSplitFraction(
      narrow,
      true,
      scriptedDraws([drawOpeningTheThreeQuarterSlice, 1]),
    );
    expect(fraction).toBe(0.7);
  });
});

describe('splitRect', () => {
  const parent = rectOf({ x: 0.5, y: 0.25, width: 0.25, height: 0.5, depth: 3, id: 7 });

  it('cuts a vertical line a quarter of the way across', () => {
    expect(splitRect(parent, true, 0.25)).toStrictEqual([
      { x: 0.5, y: 0.25, width: 0.0625, height: 0.5, depth: 4, id: 0 },
      { x: 0.5625, y: 0.25, width: 0.1875, height: 0.5, depth: 4, id: 0 },
    ]);
  });

  it('cuts a horizontal line a quarter of the way down', () => {
    expect(splitRect(parent, false, 0.25)).toStrictEqual([
      { x: 0.5, y: 0.25, width: 0.25, height: 0.125, depth: 4, id: 0 },
      { x: 0.5, y: 0.375, width: 0.25, height: 0.375, depth: 4, id: 0 },
    ]);
  });

  it('leaves the two halves touching, with no gap and no overlap', () => {
    const [firstHalf, secondHalf] = splitRect(parent, true, 0.618);
    expect(firstHalf.x + firstHalf.width).toBe(secondHalf.x);
    expect(secondHalf.x + secondHalf.width).toBe(parent.x + parent.width);
  });
});

describe('generateLayout', () => {
  it('paints the same canvas the seed has always painted', () => {
    expect(generateLayout({ seed: SAMPLE_SEED, complexity: 6 })).toStrictEqual([
      { x: 0, y: 0, width: 0.26492539906572693, height: 0.19486528187058866, depth: 3, id: 0 },
      {
        x: 0.26492539906572693,
        y: 0,
        width: 0.49319560479674346,
        height: 0.19486528187058866,
        depth: 3,
        id: 1,
      },
      {
        x: 0,
        y: 0.19486528187058866,
        width: 0.7581210038624704,
        height: 0.6251949803172909,
        depth: 3,
        id: 2,
      },
      {
        x: 0,
        y: 0.8200602621878796,
        width: 0.7581210038624704,
        height: 0.17993973781212036,
        depth: 3,
        id: 3,
      },
      { x: 0.7581210038624704, y: 0, width: 0.16933492328331878, height: 1, depth: 2, id: 4 },
      { x: 0.9274559271457892, y: 0, width: 0.07254407285421083, height: 1, depth: 2, id: 5 },
    ]);
  });

  it('stops at exactly the requested complexity', () => {
    expect(generateLayout({ seed: SAMPLE_SEED, complexity: 22 })).toHaveLength(22);
  });

  it('clamps complexity below the safety floor up to 4', () => {
    expect(generateLayout({ seed: SAMPLE_SEED, complexity: 1 })).toHaveLength(4);
  });

  it('produces non-overlapping rectangles tiling the unit square', () => {
    const layout = generateLayout({ seed: SAMPLE_SEED, complexity: 12 });
    const totalArea = layout.reduce(
      (areaSum, generatedRect) => areaSum + generatedRect.width * generatedRect.height,
      0,
    );
    expect(totalArea).toBeCloseTo(1, 6);
    for (let firstIndex = 0; firstIndex < layout.length; firstIndex++) {
      for (let secondIndex = firstIndex + 1; secondIndex < layout.length; secondIndex++) {
        const firstRect = layout[firstIndex];
        const secondRect = layout[secondIndex];
        if (!firstRect || !secondRect) continue;
        const isOverlapsHorizontally =
          firstRect.x < secondRect.x + secondRect.width &&
          secondRect.x < firstRect.x + firstRect.width;
        const isOverlapsVertically =
          firstRect.y < secondRect.y + secondRect.height &&
          secondRect.y < firstRect.y + firstRect.height;
        expect(isOverlapsHorizontally && isOverlapsVertically).toBe(false);
      }
    }
  });

  it('assigns sequential ids', () => {
    const layout = generateLayout({ seed: SAMPLE_SEED, complexity: 8 });
    expect(layout.map((generatedRect) => generatedRect.id)).toStrictEqual(
      layout.map((_generatedRect, sequentialIndex) => sequentialIndex),
    );
  });

  it('is deterministic for a given seed + complexity pair', () => {
    const firstLayout = generateLayout({ seed: SAMPLE_SEED, complexity: 14 });
    const secondLayout = generateLayout({ seed: SAMPLE_SEED, complexity: 14 });
    expect(firstLayout).toStrictEqual(secondLayout);
  });

  it('stops when the canvas has no rectangle left to cut, however high the complexity', () => {
    expect(generateLayout({ seed: SAMPLE_SEED, complexity: 9999 })).toHaveLength(167);
  });

  it('leaves no rectangle smaller than the minimum dimension, however high the complexity', () => {
    for (const generatedRect of generateLayout({ seed: SAMPLE_SEED, complexity: 9999 })) {
      expect(generatedRect.width).toBeGreaterThan(MIN_RECT_DIMENSION - FLOAT_DRIFT);
      expect(generatedRect.height).toBeGreaterThan(MIN_RECT_DIMENSION - FLOAT_DRIFT);
    }
  });

  it('produces both vertical and horizontal splits across many seeds', () => {
    let isSawVerticalSplit = false;
    let isSawHorizontalSplit = false;
    for (
      let seedIndex = 1;
      seedIndex < 30 && !(isSawVerticalSplit && isSawHorizontalSplit);
      seedIndex++
    ) {
      const layout = generateLayout({ seed: seedIndex, complexity: 22 });
      const xCoords = new Set(layout.map((generatedRect) => generatedRect.x));
      const yCoords = new Set(layout.map((generatedRect) => generatedRect.y));
      if (xCoords.size > 2) isSawVerticalSplit = true;
      if (yCoords.size > 2) isSawHorizontalSplit = true;
    }
    expect(isSawVerticalSplit).toBe(true);
    expect(isSawHorizontalSplit).toBe(true);
  });
});

describe('selectNeutralProbability', () => {
  it('leaves a small rectangle neutral less often than a large one', () => {
    expect(selectNeutralProbability(0.1, 0)).toBe(0.63);
  });

  it('stops rewarding area once a rectangle covers a quarter of the canvas', () => {
    expect(selectNeutralProbability(0.5, 0)).toBe(0.9);
    expect(selectNeutralProbability(0.25, 0)).toBe(0.9);
  });

  it('turns neutrals into colour as the balance rises', () => {
    expect(selectNeutralProbability(0.1, 1)).toBe(0.33);
    expect(selectNeutralProbability(0.1, 0.5)).toBe(0.48);
  });
});

describe('isNeutralDraw', () => {
  it('leaves the rectangle neutral for a draw below the probability', () => {
    expect(isNeutralDraw(0.62, 0.1, 0)).toBe(true);
  });

  it('colours the rectangle for a draw sitting exactly on the probability', () => {
    expect(isNeutralDraw(selectNeutralProbability(0.1, 0), 0.1, 0)).toBe(false);
  });
});

describe('splitPaletteFills', () => {
  it('holds back the first fill matching the paper and keeps the repeat as a colour', () => {
    expect(splitPaletteFills(PALETTES.classic)).toStrictEqual({
      neutralFill: { nameKey: 'mondrian.colour.ivory', hex: '#fafafa' },
      nonNeutralFills: [
        { nameKey: 'mondrian.colour.vermillion', hex: '#d8332a' },
        { nameKey: 'mondrian.colour.cobalt', hex: '#1e4fb6' },
        { nameKey: 'mondrian.colour.saffron', hex: '#f5c518' },
        { nameKey: 'mondrian.colour.ivory', hex: '#fafafa' },
        { nameKey: 'mondrian.colour.onyx', hex: '#1a1714' },
      ],
    });
  });

  it('matches the paper whatever case the two hexes are written in', () => {
    expect(
      splitPaletteFills({
        bg: '#FAFAFA',
        line: '#000000',
        fills: [
          { nameKey: 'mondrian.colour.vermillion', hex: '#d8332a' },
          { nameKey: 'mondrian.colour.ivory', hex: '#fafafa' },
        ],
      }),
    ).toStrictEqual({
      neutralFill: { nameKey: 'mondrian.colour.ivory', hex: '#fafafa' },
      nonNeutralFills: [{ nameKey: 'mondrian.colour.vermillion', hex: '#d8332a' }],
    });
  });

  it('holds back a paper colour sitting first in the palette', () => {
    expect(
      splitPaletteFills({
        bg: '#fafafa',
        line: '#000000',
        fills: [
          { nameKey: 'mondrian.colour.ivory', hex: '#fafafa' },
          { nameKey: 'mondrian.colour.vermillion', hex: '#d8332a' },
        ],
      }),
    ).toStrictEqual({
      neutralFill: { nameKey: 'mondrian.colour.ivory', hex: '#fafafa' },
      nonNeutralFills: [{ nameKey: 'mondrian.colour.vermillion', hex: '#d8332a' }],
    });
  });

  it('finds no neutral in a palette that carries no fill the colour of the paper', () => {
    expect(
      splitPaletteFills({
        bg: '#ffffff',
        line: '#000000',
        fills: [{ nameKey: 'mondrian.colour.vermillion', hex: '#d8332a' }],
      }),
    ).toStrictEqual({
      neutralFill: undefined,
      nonNeutralFills: [{ nameKey: 'mondrian.colour.vermillion', hex: '#d8332a' }],
    });
  });
});

describe('pickUniform', () => {
  const flowers = ['rose', 'daisy', 'iris', 'tulip'] as const;

  it('picks the first element for the lowest draw', () => {
    expect(pickUniform(flowers, () => 0)).toBe('rose');
  });

  it('picks an element in the middle by walking to its index', () => {
    expect(pickUniform(flowers, () => 0.5)).toBe('iris');
  });

  it('picks the last element for the highest draw', () => {
    expect(pickUniform(flowers, () => 0.99)).toBe('tulip');
  });

  it('picks nothing from an empty list', () => {
    expect(pickUniform([], () => 0.5)).toBeNull();
  });
});

describe('colorize', () => {
  const sampleLayout = generateLayout({ seed: SAMPLE_SEED, complexity: 22 });

  it('paints the same colours the seed has always painted', () => {
    const coloredRects = colorize(sampleLayout, {
      seed: SAMPLE_SEED,
      palette: PALETTES.classic,
      balance: 0.5,
    });
    expect(coloredRects.map((coloredRect) => coloredRect.fillNameKey)).toStrictEqual([
      'mondrian.colour.ivory',
      'mondrian.colour.vermillion',
      'mondrian.colour.ivory',
      'mondrian.colour.cobalt',
      'mondrian.colour.ivory',
      'mondrian.colour.ivory',
      'mondrian.colour.ivory',
      'mondrian.colour.ivory',
      'mondrian.colour.saffron',
      'mondrian.colour.ivory',
      'mondrian.colour.ivory',
      'mondrian.colour.saffron',
      'mondrian.colour.onyx',
      'mondrian.colour.ivory',
      'mondrian.colour.ivory',
      'mondrian.colour.ivory',
      'mondrian.colour.ivory',
      'mondrian.colour.cobalt',
      'mondrian.colour.ivory',
      'mondrian.colour.ivory',
      'mondrian.colour.ivory',
      'mondrian.colour.ivory',
    ]);
  });

  it('keeps every rect of the layout, geometry untouched', () => {
    const coloredRects = colorize(sampleLayout, {
      seed: SAMPLE_SEED,
      palette: PALETTES.classic,
      balance: 0.5,
    });
    expect(coloredRects).toHaveLength(sampleLayout.length);
    for (const [rectIndex, coloredRect] of coloredRects.entries()) {
      expect(coloredRect.fill).toMatch(/^#[0-9a-f]{6}$/i);
      expect(coloredRect.fillNameKey.length).toBeGreaterThan(0);
      expect(sampleLayout[rectIndex]).toMatchObject({
        x: coloredRect.x,
        y: coloredRect.y,
        width: coloredRect.width,
        height: coloredRect.height,
        id: coloredRect.id,
      });
    }
  });

  it('draws only from the colours when the palette carries nothing the colour of the paper', () => {
    const paletteWithoutNeutral: Palette = {
      bg: '#ffffff',
      line: '#000000',
      fills: [
        { nameKey: 'mondrian.colour.vermillion', hex: '#d8332a' },
        { nameKey: 'mondrian.colour.cobalt', hex: '#1e4fb6' },
        { nameKey: 'mondrian.colour.saffron', hex: '#f5c518' },
      ],
    };
    const coloredRects = colorize(generateLayout({ seed: SAMPLE_SEED, complexity: 8 }), {
      seed: SAMPLE_SEED,
      palette: paletteWithoutNeutral,
      balance: 0.5,
    });
    expect(coloredRects.map((coloredRect) => coloredRect.fillNameKey)).toStrictEqual([
      'mondrian.colour.cobalt',
      'mondrian.colour.cobalt',
      'mondrian.colour.vermillion',
      'mondrian.colour.vermillion',
      'mondrian.colour.vermillion',
      'mondrian.colour.cobalt',
      'mondrian.colour.vermillion',
      'mondrian.colour.cobalt',
    ]);
  });

  it('produces more vibrant fills as balance increases', () => {
    const neutralHex = PALETTES.classic.bg.toLowerCase();
    const lowBalanceRects = colorize(sampleLayout, {
      seed: SAMPLE_SEED,
      palette: PALETTES.classic,
      balance: 0,
    });
    const highBalanceRects = colorize(sampleLayout, {
      seed: SAMPLE_SEED,
      palette: PALETTES.classic,
      balance: 1,
    });
    const lowVibrantCount = lowBalanceRects.filter(
      (coloredRect) => coloredRect.fill.toLowerCase() !== neutralHex,
    ).length;
    const highVibrantCount = highBalanceRects.filter(
      (coloredRect) => coloredRect.fill.toLowerCase() !== neutralHex,
    ).length;
    expect(highVibrantCount).toBeGreaterThan(lowVibrantCount);
  });

  it('is deterministic for a given seed + palette + balance', () => {
    const firstColoring = colorize(sampleLayout, {
      seed: SAMPLE_SEED,
      palette: PALETTES.classic,
      balance: 0.4,
    });
    const secondColoring = colorize(sampleLayout, {
      seed: SAMPLE_SEED,
      palette: PALETTES.classic,
      balance: 0.4,
    });
    expect(firstColoring).toStrictEqual(secondColoring);
  });

  it('falls back to the line colour when the palette has no fills', () => {
    const emptyPalette = { bg: '#000000', line: '#ff00ff', fills: [] };
    const coloredRects = colorize(sampleLayout, {
      seed: SAMPLE_SEED,
      palette: emptyPalette,
      balance: 0.5,
    });
    for (const coloredRect of coloredRects) {
      expect(coloredRect.fill).toBe('#ff00ff');
      expect(coloredRect.fillNameKey).toBe('mondrian.colour.ink');
    }
  });

  it('uses the neutral fill when the palette has only neutrals', () => {
    const neutralOnlyPalette: Palette = {
      bg: '#fafafa',
      line: '#000000',
      fills: [{ nameKey: 'mondrian.colour.ivory', hex: '#fafafa' }],
    };
    const coloredRects = colorize(sampleLayout, {
      seed: SAMPLE_SEED,
      palette: neutralOnlyPalette,
      balance: 0,
    });
    const usedFillNameKeys = new Set(coloredRects.map((coloredRect) => coloredRect.fillNameKey));
    expect(usedFillNameKeys).toStrictEqual(
      new Set(['mondrian.colour.ivory', 'mondrian.colour.ink']),
    );
  });
});
