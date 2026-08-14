/**
 * Pure cascade-on-delete helper for lineups. When a member is removed
 * from the band, their member id must be stripped from every stored
 * lineup record (song defaults + setlist entry overrides). DSQL has
 * no FK at write time, so the scrub is the only thing keeping the
 * lineup-resolver from surfacing an orphan id.
 *
 * Returns a fresh record without the target key; never mutates the
 * input.
 */

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
