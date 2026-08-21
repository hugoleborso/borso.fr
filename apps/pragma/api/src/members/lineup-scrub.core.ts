import type { Lineup } from '@domain/lineup.core';

// @FollowsBlueprint core-projection
export function scrubMemberFromLineup(lineup: Lineup, memberId: string): Lineup {
  const scrubbed: Record<string, readonly string[]> = {};
  for (const [currentMemberId, instrumentIds] of Object.entries(lineup)) {
    if (currentMemberId === memberId) continue;
    scrubbed[currentMemberId] = instrumentIds;
  }
  return scrubbed;
}
