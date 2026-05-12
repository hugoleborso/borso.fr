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
  const words = displayName.trim().split(/\s+/).filter((word) => word.length > 0);
  const firstWord = words[0];
  if (firstWord === undefined) return '??';

  if (words.length === 1) {
    return firstWord.slice(0, INITIALS_MAX_LENGTH).toUpperCase();
  }

  // words.length >= 2 here, so words[words.length - 1] is always defined —
  // the `!` lets us skip a defensive branch that no input can reach.
  const lastWord = words[words.length - 1]!;
  return (firstWord.charAt(0) + lastWord.charAt(0)).toUpperCase();
}

/**
 * Compute the avatar to display when a runner has no photo. Deterministic
 * in `displayName` — the same name always yields the same colour and the
 * same initials.
 */
export function initialsAvatar(displayName: string): InitialsAvatar {
  const hash = djb2Hash(displayName);
  const hueDegrees = ((hash % HUE_DEGREES_FULL_CIRCLE) + HUE_DEGREES_FULL_CIRCLE) % HUE_DEGREES_FULL_CIRCLE;
  return {
    initials: pickInitials(displayName),
    backgroundColor: `oklch(${OKLCH_LIGHTNESS} ${OKLCH_CHROMA} ${hueDegrees})`,
  };
}
