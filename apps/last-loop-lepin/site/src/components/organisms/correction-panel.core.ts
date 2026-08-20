import type { PillTone } from '../atoms/Pill';

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
