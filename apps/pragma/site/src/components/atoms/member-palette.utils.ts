/**
 * Member-palette helpers — resolve a member's color identifier to a
 * CSS value the atoms can consume. The site stores each member's
 * colour as a free-form hex string (Hugo picks any colour via the
 * Members admin), but the prototype's palette has five canonical
 * hues. This module exposes both:
 *
 *  - the five canonical palette tokens (`MEMBER_PALETTE`),
 *  - `paletteColorFromHex(hex)` which finds the closest canonical
 *    token for a given hex by minimum squared RGB distance,
 *  - `memberInitial(name)` which returns the single-letter initial
 *    drawn inside the Avatar (the prototype slices the name to one
 *    character).
 */

export const MEMBER_PALETTE = {
  coral: 'var(--color-member-coral)',
  teal: 'var(--color-member-teal)',
  mustard: 'var(--color-member-mustard)',
  plum: 'var(--color-member-plum)',
  sage: 'var(--color-member-sage)',
} as const;

export type MemberPaletteKey = keyof typeof MEMBER_PALETTE;

const HEX_PATTERN = /^#([0-9a-f]{6})$/i;
const HEX_RADIX = 16;
const HEX_PAIR_LENGTH = 2;
const FALLBACK_KEY: MemberPaletteKey = 'coral';

const PALETTE_RGB: Record<MemberPaletteKey, readonly [number, number, number]> = {
  coral: [0xc4, 0x58, 0x3a],
  teal: [0x3d, 0x8a, 0x8a],
  mustard: [0xc4, 0x91, 0x2b],
  plum: [0x8a, 0x48, 0x70],
  sage: [0x6e, 0x8a, 0x48],
};

function parseHexTriplet(hex: string): readonly [number, number, number] | null {
  const match = HEX_PATTERN.exec(hex.trim());
  if (!match) return null;
  const body = match[1];
  if (body === undefined) return null;
  const red = Number.parseInt(body.slice(0, HEX_PAIR_LENGTH), HEX_RADIX);
  const green = Number.parseInt(body.slice(HEX_PAIR_LENGTH, HEX_PAIR_LENGTH * 2), HEX_RADIX);
  const blue = Number.parseInt(body.slice(HEX_PAIR_LENGTH * 2), HEX_RADIX);
  return [red, green, blue] as const;
}

/**
 * Closest canonical-palette key for an arbitrary hex string. Falls
 * back to `coral` when the hex doesn't parse so the UI never renders
 * an avatar without a color.
 */
const PALETTE_KEYS: readonly MemberPaletteKey[] = [
  'coral',
  'teal',
  'mustard',
  'plum',
  'sage',
];

export function paletteKeyFromHex(hex: string): MemberPaletteKey {
  const rgb = parseHexTriplet(hex);
  if (!rgb) return FALLBACK_KEY;
  let bestKey: MemberPaletteKey = FALLBACK_KEY;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of PALETTE_KEYS) {
    const [paletteR, paletteG, paletteB] = PALETTE_RGB[candidate];
    const distance =
      (paletteR - rgb[0]) ** 2 + (paletteG - rgb[1]) ** 2 + (paletteB - rgb[2]) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestKey = candidate;
    }
  }
  return bestKey;
}

/**
 * Color value (a CSS `var(...)`) the Avatar atom consumes. Uses the
 * canonical palette token, which means dark-mode tweaks ride along
 * automatically.
 */
export function paletteColorFromHex(hex: string): string {
  return MEMBER_PALETTE[paletteKeyFromHex(hex)];
}

const SINGLE_CHARACTER = 1;

export function memberInitial(name: string): string {
  return name.trim().slice(0, SINGLE_CHARACTER).toUpperCase();
}
