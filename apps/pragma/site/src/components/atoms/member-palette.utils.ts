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

const HEX_PATTERN = /^#[0-9a-f]{6}$/i;
const HEX_RADIX = 16;
const HEX_PAIR_LENGTH = 2;
const HASH_PREFIX_LENGTH = 1;
const RED_PAIR_START = 0;
const GREEN_PAIR_START = 2;
const BLUE_PAIR_START = 4;
const FALLBACK_KEY: MemberPaletteKey = 'coral';

interface RgbChannels {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}

const PALETTE_RGB: Record<MemberPaletteKey, RgbChannels> = {
  coral: { red: 0xc4, green: 0x58, blue: 0x3a },
  teal: { red: 0x3d, green: 0x8a, blue: 0x8a },
  mustard: { red: 0xc4, green: 0x91, blue: 0x2b },
  plum: { red: 0x8a, green: 0x48, blue: 0x70 },
  sage: { red: 0x6e, green: 0x8a, blue: 0x48 },
};

/** The three channel bytes of a `#rrggbb` string, or `null` when it is not one. */
// @FollowsBlueprint utils-pure-module
export function parseHexTriplet(hex: string): readonly [number, number, number] | null {
  const trimmed = hex.trim();
  if (!HEX_PATTERN.test(trimmed)) return null;
  const body = trimmed.slice(HASH_PREFIX_LENGTH);
  const red = Number.parseInt(
    body.slice(RED_PAIR_START, RED_PAIR_START + HEX_PAIR_LENGTH),
    HEX_RADIX,
  );
  const green = Number.parseInt(
    body.slice(GREEN_PAIR_START, GREEN_PAIR_START + HEX_PAIR_LENGTH),
    HEX_RADIX,
  );
  const blue = Number.parseInt(
    body.slice(BLUE_PAIR_START, BLUE_PAIR_START + HEX_PAIR_LENGTH),
    HEX_RADIX,
  );
  return [red, green, blue] as const;
}

/**
 * Closest canonical-palette key for an arbitrary hex string. Falls
 * back to `coral` when the hex doesn't parse so the UI never renders
 * an avatar without a color.
 */
const PALETTE_KEYS: readonly MemberPaletteKey[] = ['coral', 'teal', 'mustard', 'plum', 'sage'];

export function paletteKeyFromHex(hex: string): MemberPaletteKey {
  const rgb = parseHexTriplet(hex);
  if (!rgb) return FALLBACK_KEY;
  const [red, green, blue] = rgb;
  let bestKey: MemberPaletteKey = FALLBACK_KEY;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of PALETTE_KEYS) {
    const paletteRgb = PALETTE_RGB[candidate];
    const redGap = paletteRgb.red - red;
    const greenGap = paletteRgb.green - green;
    const blueGap = paletteRgb.blue - blue;
    const distance = redGap * redGap + greenGap * greenGap + blueGap * blueGap;
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
