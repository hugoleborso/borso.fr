import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  ON_COLOR_DARK,
  ON_COLOR_DARK_RGB,
  ON_COLOR_LIGHT,
  ON_COLOR_LIGHT_RGB,
  parseHex,
  relativeLuminance,
  selectInkOnMemberColor,
} from './member-color.utils';

const SRGB_THRESHOLD = 0.03928;
const SRGB_SCALE = 12.92;
const LUMINANCE_RED_WEIGHT = 0.2126;

// @FollowsBlueprint test-pure-unit
describe('member-color.utils', () => {
  describe('parseHex', () => {
    it('parses a 6-digit hex string', () => {
      expect(parseHex('#abcdef')).toEqual({ r: 0xab, g: 0xcd, b: 0xef });
    });

    it('parses a 3-digit hex string by repeating each channel', () => {
      expect(parseHex('#abc')).toEqual({ r: 0xaa, g: 0xbb, b: 0xcc });
    });

    it('handles upper-case hex', () => {
      expect(parseHex('#ABCDEF')).toEqual({ r: 0xab, g: 0xcd, b: 0xef });
    });

    it('trims surrounding whitespace', () => {
      expect(parseHex('  #abc  ')).toEqual({ r: 0xaa, g: 0xbb, b: 0xcc });
    });

    it('returns null on a missing hash', () => {
      expect(parseHex('abcdef')).toBeNull();
    });

    it('returns null on a non-hex character', () => {
      expect(parseHex('#ggg')).toBeNull();
    });

    it('returns null on a wrong-length string', () => {
      expect(parseHex('#abcd')).toBeNull();
    });
  });

  describe('relativeLuminance', () => {
    it('returns 1 on pure white', () => {
      expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1);
    });

    it('returns 0 on pure black', () => {
      expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0);
    });

    it('is monotonic on a grey ramp', () => {
      const dim = relativeLuminance({ r: 16, g: 16, b: 16 });
      const mid = relativeLuminance({ r: 128, g: 128, b: 128 });
      const bright = relativeLuminance({ r: 240, g: 240, b: 240 });
      expect(dim).toBeLessThan(mid);
      expect(mid).toBeLessThan(bright);
    });

    it('uses the sRGB linear branch on small channels', () => {
      expect(relativeLuminance({ r: 1, g: 1, b: 1 })).toBeCloseTo(0.000303527, 9);
    });

    it('still uses the linear branch for a channel sitting exactly on the threshold', () => {
      expect(relativeLuminance({ r: SRGB_THRESHOLD * 255, g: 0, b: 0 })).toBe(
        LUMINANCE_RED_WEIGHT * (SRGB_THRESHOLD / SRGB_SCALE),
      );
    });
  });

  describe('contrastRatio', () => {
    it('is 21 between black and white, in either order', () => {
      const black = { r: 0, g: 0, b: 0 };
      const white = { r: 255, g: 255, b: 255 };
      expect(contrastRatio(black, white)).toBeCloseTo(21);
      expect(contrastRatio(white, black)).toBeCloseTo(21);
    });

    it('is 1 between a colour and itself', () => {
      expect(contrastRatio({ r: 196, g: 88, b: 58 }, { r: 196, g: 88, b: 58 })).toBe(1);
    });
  });

  describe('selectInkOnMemberColor', () => {
    const darkInk = ON_COLOR_DARK_RGB;
    const lightInk = ON_COLOR_LIGHT_RGB;

    it('holds each ink as a hex value and as its channels', () => {
      expect(parseHex(ON_COLOR_DARK)).toEqual(ON_COLOR_DARK_RGB);
      expect(parseHex(ON_COLOR_LIGHT)).toEqual(ON_COLOR_LIGHT_RGB);
    });

    it.each([
      ['coral', '#c4583a', 'on-color-dark', 4.55],
      ['teal', '#3d8a8a', 'on-color-dark', 4.93],
      ['mustard', '#c4912b', 'on-color-dark', 7.04],
      ['plum', '#8a4870', 'on-color-light', 6.37],
      ['sage', '#6e8a48', 'on-color-dark', 5.11],
    ] as const)('draws on %s (%s) with %s at 4.5:1 or more', (_name, hex, expected, ratio) => {
      expect(selectInkOnMemberColor(hex)).toBe(expected);
      const color = parseHex(hex);
      const ink = expected === 'on-color-dark' ? darkInk : lightInk;
      if (color === null) throw new Error('palette colour does not parse');
      expect(contrastRatio(color, ink)).toBeCloseTo(ratio, 2);
      expect(contrastRatio(color, ink)).toBeGreaterThanOrEqual(4.5);
    });

    it('takes the light ink on a colour as dark as the dark ink', () => {
      expect(selectInkOnMemberColor('#000000')).toBe('on-color-light');
      expect(selectInkOnMemberColor('#ffffff')).toBe('on-color-dark');
    });

    it('falls back to the dark ink on a malformed colour', () => {
      expect(selectInkOnMemberColor('coral')).toBe('on-color-dark');
    });
  });
});
