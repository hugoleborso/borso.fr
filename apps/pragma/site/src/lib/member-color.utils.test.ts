import { describe, expect, it } from 'vitest';
import {
  foregroundForLuminance,
  parseHex,
  READABLE_THRESHOLD,
  readableForeground,
  relativeLuminance,
} from './member-color.utils';

const SRGB_THRESHOLD = 0.03928;
const SRGB_SCALE = 12.92;
const LUMINANCE_RED_WEIGHT = 0.2126;

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

  describe('foregroundForLuminance', () => {
    it('reads a luminance sitting exactly on the threshold as dark', () => {
      expect(foregroundForLuminance(READABLE_THRESHOLD)).toBe('#fffefa');
    });

    it('reads a luminance just past the threshold as light', () => {
      expect(foregroundForLuminance(READABLE_THRESHOLD + 0.001)).toBe('#1a1814');
    });
  });

  describe('readableForeground', () => {
    it('returns the ink color on a bright background', () => {
      expect(readableForeground('#ffffff')).toBe('#1a1814');
    });

    it('returns the surface color on a dark background', () => {
      expect(readableForeground('#000000')).toBe('#fffefa');
    });

    it('falls back to the ink color on a malformed hex', () => {
      expect(readableForeground('rebeccapurple')).toBe('#1a1814');
    });
  });
});
