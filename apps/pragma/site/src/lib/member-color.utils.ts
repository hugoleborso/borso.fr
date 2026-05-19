/**
 * Member-color helpers — pure, side-effect-free.
 *
 *  - `parseHex(hex)` turns `#abc` or `#aabbcc` into `{ r, g, b }`. Returns
 *    `null` on malformed input.
 *  - `relativeLuminance({ r, g, b })` is the WCAG luminance formula (sRGB
 *    components → linearised → weighted sum). Used to pick the chip's
 *    readable foreground.
 *  - `readableForeground(hex)` returns `'#1a1814'` (paper ink) when the
 *    background is light, `'#fffefa'` (paper surface) when it is dark.
 *    The threshold sits at the standard 0.5 luminance cutoff — bright
 *    enough to be more "white-on-dark" than "black-on-light".
 *
 * The constants below come from the design tokens; they MUST stay in
 * sync with `styles/design-tokens.css` (`--ink` / `--surface`).
 */

const HEX_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const HEX_RADIX = 16;
const SHORT_HEX_LENGTH = 3;
const BYTE_MAX = 255;
const SRGB_THRESHOLD = 0.03928;
const SRGB_SCALE = 12.92;
const SRGB_GAMMA_OFFSET = 0.055;
const SRGB_GAMMA_DIVISOR = 1.055;
const SRGB_GAMMA = 2.4;
const LUMINANCE_RED_WEIGHT = 0.2126;
const LUMINANCE_GREEN_WEIGHT = 0.7152;
const LUMINANCE_BLUE_WEIGHT = 0.0722;
const READABLE_THRESHOLD = 0.5;

const FOREGROUND_ON_LIGHT = '#1a1814';
const FOREGROUND_ON_DARK = '#fffefa';

export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export function parseHex(hex: string): Rgb | null {
  const match = HEX_PATTERN.exec(hex.trim());
  if (match === null) return null;
  const raw = match[1] ?? '';
  const normalised =
    raw.length === SHORT_HEX_LENGTH
      ? raw
          .split('')
          .map((character) => character + character)
          .join('')
      : raw;
  const r = Number.parseInt(normalised.slice(0, 2), HEX_RADIX);
  const g = Number.parseInt(normalised.slice(2, 4), HEX_RADIX);
  const b = Number.parseInt(normalised.slice(4, 6), HEX_RADIX);
  return { r, g, b };
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

export function readableForeground(hex: string): string {
  const rgb = parseHex(hex);
  if (rgb === null) return FOREGROUND_ON_LIGHT;
  const luminance = relativeLuminance(rgb);
  return luminance > READABLE_THRESHOLD ? FOREGROUND_ON_LIGHT : FOREGROUND_ON_DARK;
}
