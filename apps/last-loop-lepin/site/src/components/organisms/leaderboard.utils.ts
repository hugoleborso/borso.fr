/**
 * The two presentation decisions the leaderboard makes per chip: whether the
 * chip is tappable, and which modifier its class carries.
 */

export type ChipInteractivity = 'tappable' | 'display-only';

// @FollowsBlueprint core-view-intent
export function selectChipInteractivity(hasSelectHandler: boolean): ChipInteractivity {
  return hasSelectHandler ? 'tappable' : 'display-only';
}

export function composeChipClassName(isRunnerOut: boolean): string {
  if (isRunnerOut) return 'leaderboard-chip leaderboard-chip--dnf';
  return 'leaderboard-chip';
}

/** Chips are keyed by edition and slug, which is unique across editions. */
export function composeChipKey(editionSlug: string, runnerSlug: string): string {
  return `${editionSlug}-${runnerSlug}`;
}
