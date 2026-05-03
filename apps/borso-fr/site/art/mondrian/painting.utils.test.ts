import { describe, expect, it } from 'vitest';
import { PALETTES } from './palettes.utils';
import {
  colorize,
  generateLayout,
  mulberry32,
  pickSplitFraction,
  pickSplittableEntry,
} from './painting.utils';

describe('mulberry32', () => {
  it('is deterministic for a fixed seed', () => {
    const firstStream = mulberry32(0x1234);
    const secondStream = mulberry32(0x1234);
    const firstSequence = Array.from({ length: 10 }, firstStream);
    const secondSequence = Array.from({ length: 10 }, secondStream);
    expect(firstSequence).toStrictEqual(secondSequence);
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

describe('pickSplittableEntry', () => {
  it('returns null when every rect is below the splittable threshold', () => {
    const tinyRects = [
      { x: 0, y: 0, width: 0.05, height: 0.05, depth: 0, id: 0 },
      { x: 0.5, y: 0, width: 0.05, height: 0.05, depth: 0, id: 1 },
    ];
    const stream = mulberry32(1);
    expect(pickSplittableEntry(tinyRects, stream)).toBeNull();
  });

  it('returns null when given an empty rect array', () => {
    expect(pickSplittableEntry([], mulberry32(1))).toBeNull();
  });

  it('returns a splittable rect when at least one is large enough', () => {
    const mixedRects = [
      { x: 0, y: 0, width: 0.05, height: 0.05, depth: 0, id: 0 },
      { x: 0.5, y: 0, width: 0.5, height: 0.5, depth: 0, id: 1 },
    ];
    const splitTarget = pickSplittableEntry(mixedRects, mulberry32(1));
    expect(splitTarget).not.toBeNull();
    expect(splitTarget?.rectIndex).toBe(1);
  });

  it('breaks early on the first matching rect (covers cumulative-weight branch)', () => {
    const rectsTwoLarge = [
      { x: 0, y: 0, width: 0.4, height: 0.4, depth: 0, id: 0 },
      { x: 0.4, y: 0, width: 0.6, height: 1, depth: 0, id: 1 },
    ];
    const lowDrawStream = () => 0.001;
    const splitTarget = pickSplittableEntry(rectsTwoLarge, lowDrawStream);
    expect(splitTarget).not.toBeNull();
    expect(splitTarget?.rectIndex).toBe(0);
  });

  it('continues past earlier rects when cumulative weight has not been reached', () => {
    const rectsTwoLarge = [
      { x: 0, y: 0, width: 0.4, height: 0.4, depth: 0, id: 0 },
      { x: 0.4, y: 0, width: 0.6, height: 1, depth: 0, id: 1 },
    ];
    const highDrawStream = () => 0.999;
    const splitTarget = pickSplittableEntry(rectsTwoLarge, highDrawStream);
    expect(splitTarget).not.toBeNull();
    expect(splitTarget?.rectIndex).toBe(1);
  });
});

describe('pickSplitFraction', () => {
  it.each([
    { rollValue: 0 / 7 + 0.001, expected: 0.382 },
    { rollValue: 1 / 7 + 0.001, expected: 0.5 },
    { rollValue: 2 / 7 + 0.001, expected: 0.618 },
    { rollValue: 3 / 7 + 0.001, expected: 0.333 },
    { rollValue: 4 / 7 + 0.001, expected: 0.667 },
    { rollValue: 5 / 7 + 0.001, expected: 0.25 },
    { rollValue: 6 / 7 + 0.001, expected: 0.75 },
  ])('roll $rollValue → fraction $expected', ({ rollValue, expected }) => {
    expect(pickSplitFraction(() => rollValue)).toBe(expected);
  });
});

describe('generateLayout', () => {
  const sampleSeed = 0x9bd1c87f;

  it('produces at least the requested complexity rect count', () => {
    const layout = generateLayout({ seed: sampleSeed, complexity: 22 });
    expect(layout.length).toBeGreaterThanOrEqual(22);
  });

  it('clamps complexity below the safety floor up to 4', () => {
    const layout = generateLayout({ seed: sampleSeed, complexity: 1 });
    expect(layout.length).toBeGreaterThanOrEqual(4);
  });

  it('produces non-overlapping rectangles tiling the unit square', () => {
    const layout = generateLayout({ seed: sampleSeed, complexity: 12 });
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
        const overlapsHorizontally =
          firstRect.x < secondRect.x + secondRect.width && secondRect.x < firstRect.x + firstRect.width;
        const overlapsVertically =
          firstRect.y < secondRect.y + secondRect.height && secondRect.y < firstRect.y + firstRect.height;
        expect(overlapsHorizontally && overlapsVertically).toBe(false);
      }
    }
  });

  it('assigns sequential ids', () => {
    const layout = generateLayout({ seed: sampleSeed, complexity: 8 });
    expect(layout.map((generatedRect) => generatedRect.id)).toStrictEqual(
      layout.map((_generatedRect, sequentialIndex) => sequentialIndex),
    );
  });

  it('is deterministic for a given seed + complexity pair', () => {
    const firstLayout = generateLayout({ seed: sampleSeed, complexity: 14 });
    const secondLayout = generateLayout({ seed: sampleSeed, complexity: 14 });
    expect(firstLayout).toStrictEqual(secondLayout);
  });

  it('respects the iteration safety cap when complexity is unreachable', () => {
    const layout = generateLayout({ seed: sampleSeed, complexity: 9999 });
    expect(layout.length).toBeLessThan(9999);
    expect(layout.length).toBeGreaterThan(0);
  });

  it('produces both vertical and horizontal splits across many seeds (covers vertical / horizontal branches)', () => {
    let sawVerticalSplit = false;
    let sawHorizontalSplit = false;
    for (let seedIndex = 1; seedIndex < 30 && !(sawVerticalSplit && sawHorizontalSplit); seedIndex++) {
      const layout = generateLayout({ seed: seedIndex, complexity: 22 });
      const xCoords = new Set(layout.map((generatedRect) => generatedRect.x));
      const yCoords = new Set(layout.map((generatedRect) => generatedRect.y));
      if (xCoords.size > 2) sawVerticalSplit = true;
      if (yCoords.size > 2) sawHorizontalSplit = true;
    }
    expect(sawVerticalSplit).toBe(true);
    expect(sawHorizontalSplit).toBe(true);
  });
});

describe('colorize', () => {
  const sampleSeed = 0x9bd1c87f;
  const sampleLayout = generateLayout({ seed: sampleSeed, complexity: 18 });

  it('attaches a fill and fillName to every rect', () => {
    const coloredRects = colorize(sampleLayout, {
      seed: sampleSeed,
      palette: PALETTES.classic,
      balance: 0.5,
    });
    expect(coloredRects).toHaveLength(sampleLayout.length);
    for (const coloredRect of coloredRects) {
      expect(coloredRect.fill).toMatch(/^#[0-9a-f]{6}$/i);
      expect(coloredRect.fillName.length).toBeGreaterThan(0);
    }
  });

  it('produces more vibrant fills as balance increases', () => {
    const neutralHex = PALETTES.classic.bg.toLowerCase();
    const lowBalanceRects = colorize(sampleLayout, {
      seed: sampleSeed,
      palette: PALETTES.classic,
      balance: 0,
    });
    const highBalanceRects = colorize(sampleLayout, {
      seed: sampleSeed,
      palette: PALETTES.classic,
      balance: 1,
    });
    const lowVibrantCount = lowBalanceRects.filter(
      (coloredRect) => coloredRect.fill.toLowerCase() !== neutralHex,
    ).length;
    const highVibrantCount = highBalanceRects.filter(
      (coloredRect) => coloredRect.fill.toLowerCase() !== neutralHex,
    ).length;
    expect(highVibrantCount).toBeGreaterThanOrEqual(lowVibrantCount);
  });

  it('is deterministic for a given seed + palette + balance', () => {
    const firstColoring = colorize(sampleLayout, {
      seed: sampleSeed,
      palette: PALETTES.classic,
      balance: 0.4,
    });
    const secondColoring = colorize(sampleLayout, {
      seed: sampleSeed,
      palette: PALETTES.classic,
      balance: 0.4,
    });
    expect(firstColoring).toStrictEqual(secondColoring);
  });

  it('falls back to the line colour when the palette has no fills', () => {
    const emptyPalette = { label: 'Empty', bg: '#000000', line: '#ff00ff', fills: [] };
    const coloredRects = colorize(sampleLayout, {
      seed: sampleSeed,
      palette: emptyPalette,
      balance: 0.5,
    });
    for (const coloredRect of coloredRects) {
      expect(coloredRect.fill).toBe('#ff00ff');
      expect(coloredRect.fillName).toBe('line');
    }
  });

  it('uses the neutral fill when the palette has only neutrals', () => {
    const neutralOnlyPalette = {
      label: 'Neutral',
      bg: '#fafafa',
      line: '#000000',
      fills: [{ name: 'Ivory', hex: '#fafafa' }],
    };
    const coloredRects = colorize(sampleLayout, {
      seed: sampleSeed,
      palette: neutralOnlyPalette,
      balance: 0,
    });
    const allFills = new Set(coloredRects.map((coloredRect) => coloredRect.fill.toLowerCase()));
    expect(allFills.has('#fafafa') || allFills.has('#000000')).toBe(true);
  });
});
