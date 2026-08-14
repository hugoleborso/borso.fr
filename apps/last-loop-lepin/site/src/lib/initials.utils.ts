/**
 * Avatar fallback helpers — pure, deterministic.
 *
 * Drives the placeholder rendered when a runner has no photo: two-letter
 * initials on an OKLCH-based coloured background derived from the runner's
 * display name. Same name → same colour, always.
 */

const HASH_INITIAL = 5381;
const HASH_MULTIPLIER = 33;
const OKLCH_LIGHTNESS = 0.72;
const OKLCH_CHROMA = 0.14;
const HUE_DEGREES_FULL_CIRCLE = 360;
const INITIALS_MAX_LENGTH = 2;
const WORD_PATTERN = /\S+/g;
const NO_NAME_INITIALS = '??';

export interface InitialsAvatar {
  readonly initials: string;
  readonly backgroundColor: string;
}

function djb2Hash(input: string): number {
  let accumulator = HASH_INITIAL;
  for (let index = 0; index < input.length; index += 1) {
    accumulator = ((accumulator * HASH_MULTIPLIER) ^ input.charCodeAt(index)) | 0;
  }
  return accumulator;
}

function pickInitials(displayName: string): string {
  // `matchAll` over runs of non-space is the whitespace split without the
  // empty entries a `split` on a single-space pattern would leave behind,
  // and each match's group 0 types as `string`, so no index access is
  // needed to read the initial off it.
  const wordInitials = Array.from(displayName.matchAll(WORD_PATTERN), (match) =>
    match[0].charAt(0),
  );
  const [firstInitial, ...laterInitials] = wordInitials;
  if (firstInitial === undefined) return NO_NAME_INITIALS;
  const lastInitial = laterInitials.at(-1);
  if (lastInitial === undefined) {
    return displayName.trim().slice(0, INITIALS_MAX_LENGTH).toUpperCase();
  }
  return (firstInitial + lastInitial).toUpperCase();
}

/**
 * Compute the avatar to display when a runner has no photo. Deterministic
 * in `displayName` — the same name always yields the same colour and the
 * same initials.
 */
// @FollowsBlueprint utils-pure-module
export function initialsAvatar(displayName: string): InitialsAvatar {
  const hash = djb2Hash(displayName);
  const hueDegrees =
    ((hash % HUE_DEGREES_FULL_CIRCLE) + HUE_DEGREES_FULL_CIRCLE) % HUE_DEGREES_FULL_CIRCLE;
  return {
    initials: pickInitials(displayName),
    backgroundColor: `oklch(${OKLCH_LIGHTNESS} ${OKLCH_CHROMA} ${hueDegrees})`,
  };
}
