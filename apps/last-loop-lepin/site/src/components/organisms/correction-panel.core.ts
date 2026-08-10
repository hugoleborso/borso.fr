/**
 * The two readings the corrections tab makes: which runner row is open, and
 * how a punch reads once it has been cancelled.
 */

import type { PillTone } from '../atoms/Pill';

/** Tapping the open runner closes it; tapping another one opens that instead. */
export function selectToggledRunner(
  openRunnerSlug: string | null,
  tappedRunnerSlug: string,
): string | null {
  if (openRunnerSlug === tappedRunnerSlug) return null;
  return tappedRunnerSlug;
}

// @FollowsBlueprint core-view-intent
export function selectPunchTone(voidedAt: string | null): PillTone {
  if (voidedAt === null) return 'in-race';
  return 'out';
}
