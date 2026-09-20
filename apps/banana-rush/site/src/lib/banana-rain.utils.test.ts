import { describe, expect, it } from 'vitest';
import { buildBananaRain, createSeededDraw } from './banana-rain.utils';

const PROBE_SEED = 7;
const RAIN_SEED = 20_260_920;
const FULL_RAIN_COUNT = 14;

function drawFromCycle(values: readonly number[]): () => number {
  let cursor = 0;
  return () => {
    const value = values[cursor % values.length] ?? 0;
    cursor += 1;
    return value;
  };
}

describe('createSeededDraw', () => {
  it('returns the same sequence of fractions for the same seed', () => {
    const first = createSeededDraw(PROBE_SEED);
    const second = createSeededDraw(PROBE_SEED);

    expect([first(), first(), first(), first()]).toStrictEqual([
      0.238_780_839_834_362_27, 0.913_493_264_699_354_8, 0.612_491_666_339_337_8,
      0.926_981_459_138_914_9,
    ]);
    expect([second(), second()]).toStrictEqual([0.238_780_839_834_362_27, 0.913_493_264_699_354_8]);
  });

  it('returns a different first fraction for a different seed', () => {
    expect(createSeededDraw(PROBE_SEED)()).not.toBe(createSeededDraw(PROBE_SEED + 1)());
  });
});

describe('buildBananaRain', () => {
  it('gives every banana its own column, size, timing and spin', () => {
    const drops = buildBananaRain(2, drawFromCycle([0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95]));

    expect(drops).toStrictEqual([
      {
        leftPercent: 2.2,
        sizePixels: 21,
        fallSeconds: 3.44,
        fallDelaySeconds: 1.4,
        spinSeconds: 3.49,
        spinDirection: 'normal',
      },
      {
        leftPercent: 85.8,
        sizePixels: 19,
        fallSeconds: 3.08,
        fallDelaySeconds: 0.98,
        spinSeconds: 3.1,
        spinDirection: 'normal',
      },
    ]);
  });

  it('puts a banana at the left edge of each column at the low end of every range', () => {
    expect(buildBananaRain(2, () => 0)).toStrictEqual([
      {
        leftPercent: 0,
        sizePixels: 18,
        fallSeconds: 2.6,
        fallDelaySeconds: 0,
        spinSeconds: 1.8,
        spinDirection: 'reverse',
      },
      {
        leftPercent: 44,
        sizePixels: 18,
        fallSeconds: 2.6,
        fallDelaySeconds: 0,
        spinSeconds: 1.8,
        spinDirection: 'reverse',
      },
    ]);
  });

  it('spins forwards from the middle of the range upwards', () => {
    expect(buildBananaRain(1, () => 0.5)).toStrictEqual([
      {
        leftPercent: 44,
        sizePixels: 26,
        fallSeconds: 3.8,
        fallDelaySeconds: 1.4,
        spinSeconds: 3.1,
        spinDirection: 'normal',
      },
    ]);
  });

  it('draws as many bananas as asked, each further right than the last', () => {
    const drops = buildBananaRain(FULL_RAIN_COUNT, createSeededDraw(RAIN_SEED));

    expect(drops.map((drop) => drop.leftPercent)).toStrictEqual([
      2.54, 7.37, 12.59, 20.32, 30.48, 32.66, 42.18, 46.59, 50.66, 61.45, 64.94, 74.89, 75.98, 83.4,
    ]);
  });

  it('draws nothing when asked for no bananas', () => {
    expect(buildBananaRain(0, () => 0)).toStrictEqual([]);
  });
});
