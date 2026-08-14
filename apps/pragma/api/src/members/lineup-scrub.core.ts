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

// @FollowsBlueprint core-projection
export function scrubMemberFromLineup(
  lineup: Readonly<Record<string, string | null>>,
  memberId: string,
): Record<string, string | null> {
  const scrubbed: Record<string, string | null> = {};
  for (const [currentMemberId, instrumentId] of Object.entries(lineup)) {
    if (currentMemberId === memberId) continue;
    scrubbed[currentMemberId] = instrumentId;
  }
  return scrubbed;
}
