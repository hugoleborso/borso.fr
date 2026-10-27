/** @Feature members */

const HEX_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const HEX_RADIX = 16;
const HASH_PREFIX_LENGTH = 1;
const SHORT_HEX_LENGTH = 3;
const HEX_PAIR_LENGTH = 2;
const RED_PAIR_START = 0;
const GREEN_PAIR_START = 2;
const BLUE_PAIR_START = 4;
const BYTE_MAX = 255;
const SRGB_THRESHOLD = 0.03928;
const SRGB_SCALE = 12.92;
const SRGB_GAMMA_OFFSET = 0.055;
const SRGB_GAMMA_DIVISOR = 1.055;
const SRGB_GAMMA = 2.4;
const LUMINANCE_RED_WEIGHT = 0.2126;
const LUMINANCE_GREEN_WEIGHT = 0.7152;
const LUMINANCE_BLUE_WEIGHT = 0.0722;

export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

const CONTRAST_OFFSET = 0.05;

export const ON_COLOR_DARK = '#0a0907';
export const ON_COLOR_LIGHT = '#fffdf8';
export const ON_COLOR_DARK_RGB: Rgb = { r: 0x0a, g: 0x09, b: 0x07 };
export const ON_COLOR_LIGHT_RGB: Rgb = { r: 0xff, g: 0xfd, b: 0xf8 };

export type MemberColorInk = 'on-color-dark' | 'on-color-light';

/**
 * @Blueprint utils-pure-module
 * @BlueprintName Pure Utility Module
 * @BlueprintUsage Use for deterministic helpers with no side effect, which the coverage gate holds at one hundred percent per file.
 * @BlueprintDescription Splits one question into layered steps that are each exported and each assertable on their own: parse the hex string into channels or return null, turn channels into a relative luminance, compare two luminances as a contrast ratio, then choose the ink with the higher ratio. Every constant of the formula carries a name, and malformed input returns null rather than throwing, so the caller decides the fallback.
 */
export function parseHex(hex: string): Rgb | null {
  const trimmed = hex.trim();
  if (!HEX_PATTERN.test(trimmed)) return null;
  const raw = trimmed.slice(HASH_PREFIX_LENGTH);
  const normalised =
    raw.length === SHORT_HEX_LENGTH
      ? raw
          .split('')
          .map((character) => character + character)
          .join('')
      : raw;
  const red = Number.parseInt(
    normalised.slice(RED_PAIR_START, RED_PAIR_START + HEX_PAIR_LENGTH),
    HEX_RADIX,
  );
  const green = Number.parseInt(
    normalised.slice(GREEN_PAIR_START, GREEN_PAIR_START + HEX_PAIR_LENGTH),
    HEX_RADIX,
  );
  const blue = Number.parseInt(
    normalised.slice(BLUE_PAIR_START, BLUE_PAIR_START + HEX_PAIR_LENGTH),
    HEX_RADIX,
  );
  return { r: red, g: green, b: blue };
}

function srgbChannel(byte: number): number {
  const normalised = byte / BYTE_MAX;
  if (normalised <= SRGB_THRESHOLD) return normalised / SRGB_SCALE;
  return ((normalised + SRGB_GAMMA_OFFSET) / SRGB_GAMMA_DIVISOR) ** SRGB_GAMMA;
}

export function relativeLuminance(rgb: Rgb): number {
  return (
    LUMINANCE_RED_WEIGHT * srgbChannel(rgb.r) +
    LUMINANCE_GREEN_WEIGHT * srgbChannel(rgb.g) +
    LUMINANCE_BLUE_WEIGHT * srgbChannel(rgb.b)
  );
}

export function contrastRatio(first: Rgb, second: Rgb): number {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + CONTRAST_OFFSET) / (darker + CONTRAST_OFFSET);
}

export function selectInkOnMemberColor(hex: string): MemberColorInk {
  const color = parseHex(hex);
  if (color === null) return 'on-color-dark';
  // Stryker disable next-line EqualityOperator: equivalent mutant, no 8-bit colour sits at exactly the same contrast with both inks
  return contrastRatio(color, ON_COLOR_LIGHT_RGB) > contrastRatio(color, ON_COLOR_DARK_RGB)
    ? 'on-color-light'
    : 'on-color-dark';
}
