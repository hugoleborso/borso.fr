import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PLAYER_COLORS } from '@domain/player-mark.core';
import { describe, expect, it } from 'vitest';

interface Oklch {
  readonly lightness: number;
  readonly chroma: number;
  readonly hue: number;
}

const MINIMUM_HUE_DISTANCE = 45;
const NEUTRAL_CHROMA = 0.06;
const MINIMUM_CONTRAST = 4.5;

const HEX_TOKEN = /--color-([a-z0-9-]+):\s*(#[0-9a-f]{6});/gu;
const CHANNEL_MAXIMUM = 255;
const HEX_RADIX = 16;
const RED_START = 1;
const GREEN_START = 3;
const BLUE_START = 5;
const CHANNEL_DIGITS = 2;
const LINEAR_THRESHOLD = 0.04045;
const LINEAR_SLOPE = 12.92;
const GAMMA_OFFSET = 0.055;
const GAMMA_SCALE = 1.055;
const GAMMA = 2.4;
const HALF_TURN_DEGREES = 180;
const FULL_TURN_DEGREES = 360;
const CONTRAST_FLARE = 0.05;
const RED_LUMINANCE = 0.2126;
const GREEN_LUMINANCE = 0.7152;
const BLUE_LUMINANCE = 0.0722;

type Vector = readonly [number, number, number];
type Matrix = readonly [Vector, Vector, Vector];

const LINEAR_TO_LMS: Matrix = [
  [0.4122214708, 0.5363325363, 0.0514459929],
  [0.2119034982, 0.6806995451, 0.1073969566],
  [0.0883024619, 0.2817188376, 0.6299787005],
];

const LMS_TO_LAB: Matrix = [
  [0.2104542553, 0.793617785, -0.0040720468],
  [1.9779984951, -2.428592205, 0.4505937099],
  [0.0259040371, 0.7827717662, -0.808675766],
];

// @FollowsBlueprint utils-pure-module
function readColorTokens(css: string): ReadonlyMap<string, string> {
  return new Map([...css.matchAll(HEX_TOKEN)].map((match) => [String(match[1]), String(match[2])]));
}

function readChannel(hex: string, start: number): number {
  return Number.parseInt(hex.slice(start, start + CHANNEL_DIGITS), HEX_RADIX) / CHANNEL_MAXIMUM;
}

function toLinear(channel: number): number {
  return channel <= LINEAR_THRESHOLD
    ? channel / LINEAR_SLOPE
    : ((channel + GAMMA_OFFSET) / GAMMA_SCALE) ** GAMMA;
}

function readLinear(hex: string): Vector {
  return [
    toLinear(readChannel(hex, RED_START)),
    toLinear(readChannel(hex, GREEN_START)),
    toLinear(readChannel(hex, BLUE_START)),
  ];
}

function multiply(matrix: Matrix, vector: Vector): Vector {
  const [first, second, third] = matrix.map(
    (row) => row[0] * vector[0] + row[1] * vector[1] + row[2] * vector[2],
  );
  return [first ?? 0, second ?? 0, third ?? 0];
}

function toOklch(hex: string): Oklch {
  const [long, medium, short] = multiply(LINEAR_TO_LMS, readLinear(hex));
  const [lightness, a, b] = multiply(LMS_TO_LAB, [
    Math.cbrt(long),
    Math.cbrt(medium),
    Math.cbrt(short),
  ]);
  const degrees = (Math.atan2(b, a) * HALF_TURN_DEGREES) / Math.PI;
  return {
    lightness,
    chroma: Math.hypot(a, b),
    hue: (degrees + FULL_TURN_DEGREES) % FULL_TURN_DEGREES,
  };
}

function selectHueDistance(first: number, second: number): number {
  const apart = Math.abs(first - second) % FULL_TURN_DEGREES;
  return Math.min(apart, FULL_TURN_DEGREES - apart);
}

function isNeutral(chroma: number): boolean {
  return chroma < NEUTRAL_CHROMA;
}

function isHueTooClose(distance: number): boolean {
  return distance < MINIMUM_HUE_DISTANCE;
}

function isClashing(color: string, signal: string): boolean {
  const mark = toOklch(color);
  if (isNeutral(mark.chroma)) return false;
  return isHueTooClose(selectHueDistance(mark.hue, toOklch(signal).hue));
}

function selectLuminance(hex: string): number {
  const [red, green, blue] = readLinear(hex);
  return RED_LUMINANCE * red + GREEN_LUMINANCE * green + BLUE_LUMINANCE * blue;
}

function selectContrast(first: string, second: string): number {
  const [darker, lighter] = [selectLuminance(first), selectLuminance(second)].toSorted(
    (left, right) => left - right,
  );
  return ((lighter ?? 0) + CONTRAST_FLARE) / ((darker ?? 0) + CONTRAST_FLARE);
}

const PALETTE = readColorTokens(
  readFileSync(join(import.meta.dirname, '../styles/tokens.css'), 'utf8'),
);

function readToken(name: string): string {
  const hex = PALETTE.get(name);
  if (hex === undefined) throw new Error(`tokens.css has no --color-${name}`);
  return hex;
}

const SIGNALS = ['made', 'missed'] as const;
const BACKGROUNDS = ['ground', 'surface', 'surface-2'] as const;

// @FollowsBlueprint test-pure-unit
describe('the palette in tokens.css', () => {
  it.each(PLAYER_COLORS.flatMap((color) => SIGNALS.map((signal) => [color, signal] as const)))(
    'keeps the %s player colour apart from the %s colour',
    (color, signal) => {
      expect(isClashing(readToken(`mark-${color}`), readToken(signal))).toBe(false);
    },
  );

  it.each(
    SIGNALS.flatMap((signal) => BACKGROUNDS.map((background) => [signal, background] as const)),
  )('keeps the %s colour readable on the %s colour', (signal, background) => {
    expect(selectContrast(readToken(signal), readToken(background))).toBeGreaterThanOrEqual(
      MINIMUM_CONTRAST,
    );
  });
});

describe('readColorTokens', () => {
  it('reads every six digit colour token by name and skips the rest', () => {
    const read = readColorTokens(
      '--color-made: #22c55e;\n  --color-scrim: rgb(5 8 12 / 0.6);\n--color-mark-sky:#5aa9f0;',
    );
    expect([...read]).toEqual([
      ['made', '#22c55e'],
      ['mark-sky', '#5aa9f0'],
    ]);
  });
});

describe('toOklch', () => {
  it('converts pure red to its reference lightness, chroma and hue', () => {
    const red = toOklch('#ff0000');
    expect(red.lightness).toBeCloseTo(0.628, 3);
    expect(red.chroma).toBeCloseTo(0.2577, 3);
    expect(red.hue).toBeCloseTo(29.23, 1);
  });

  it('converts pure green and pure blue to their reference values', () => {
    const green = toOklch('#00ff00');
    expect(green.lightness).toBeCloseTo(0.8664, 3);
    expect(green.chroma).toBeCloseTo(0.2948, 3);
    expect(green.hue).toBeCloseTo(142.5, 1);
    const blue = toOklch('#0000ff');
    expect(blue.lightness).toBeCloseTo(0.452, 3);
    expect(blue.chroma).toBeCloseTo(0.3132, 3);
    expect(blue.hue).toBeCloseTo(264.05, 1);
  });

  it('reads a dark channel on the linear part of the curve', () => {
    expect(toOklch('#0a0a0a').lightness).toBeCloseTo(0.1448, 3);
    expect(toOklch('#0b0b0b').lightness).toBeCloseTo(0.1496, 3);
  });

  it('gives white full lightness and no chroma', () => {
    const white = toOklch('#ffffff');
    expect(white.lightness).toBeCloseTo(1, 3);
    expect(white.chroma).toBeCloseTo(0, 3);
  });

  it('turns a negative angle into a hue below a full turn', () => {
    const hue = toOklch('#ff00ff').hue;
    expect(hue).toBeCloseTo(328.36, 1);
  });
});

describe('selectHueDistance', () => {
  it('measures the shorter way round the hue circle', () => {
    expect(selectHueDistance(10, 350)).toBe(20);
    expect(selectHueDistance(350, 10)).toBe(20);
    expect(selectHueDistance(100, 40)).toBe(60);
    expect(selectHueDistance(0, 180)).toBe(180);
    expect(selectHueDistance(0, 720)).toBe(0);
  });
});

describe('isClashing', () => {
  it('flags a colour whose hue sits close to the signal', () => {
    expect(isClashing('#3fb8a0', '#22c55e')).toBe(true);
    expect(isClashing('#f08a4b', '#ef4444')).toBe(true);
  });

  it('accepts a colour whose hue sits far from the signal', () => {
    expect(isClashing('#5aa9f0', '#22c55e')).toBe(false);
  });

  it('flags a hue inside the minimum distance and accepts one past it', () => {
    expect(isClashing('#e2e300', '#22c55e')).toBe(true);
    expect(isClashing('#f0b429', '#22c55e')).toBe(false);
  });

  it('never flags a grey, whatever its hue', () => {
    expect(isClashing('#8f9f90', '#22c55e')).toBe(false);
  });
});

describe('selectContrast', () => {
  it('gives black on white the maximum ratio either way round', () => {
    expect(selectContrast('#000000', '#ffffff')).toBeCloseTo(21, 3);
    expect(selectContrast('#ffffff', '#000000')).toBeCloseTo(21, 3);
  });

  it('weighs the green channel most, then red, then blue', () => {
    expect(selectContrast('#00ff00', '#000000')).toBeCloseTo(15.304, 2);
    expect(selectContrast('#ff0000', '#000000')).toBeCloseTo(5.252, 2);
    expect(selectContrast('#0000ff', '#000000')).toBeCloseTo(2.444, 2);
  });

  it('gives a colour no contrast with itself', () => {
    expect(selectContrast('#22c55e', '#22c55e')).toBe(1);
  });
});

describe('toLinear', () => {
  it('keeps the straight segment up to and including the threshold', () => {
    expect(toLinear(LINEAR_THRESHOLD)).toBe(LINEAR_THRESHOLD / LINEAR_SLOPE);
  });

  it('takes the gamma curve above the threshold', () => {
    expect(toLinear(1)).toBeCloseTo(1, 10);
  });
});

describe('isNeutral', () => {
  it('reads a chroma below the threshold as grey and one at it as a colour', () => {
    expect(isNeutral(NEUTRAL_CHROMA - Number.EPSILON)).toBe(true);
    expect(isNeutral(NEUTRAL_CHROMA)).toBe(false);
  });
});

describe('isHueTooClose', () => {
  it('flags a distance below the minimum and accepts one at it', () => {
    expect(isHueTooClose(MINIMUM_HUE_DISTANCE - 1)).toBe(true);
    expect(isHueTooClose(MINIMUM_HUE_DISTANCE)).toBe(false);
  });
});
