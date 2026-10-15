import { instrumentsHeldBy, type Lineup } from '@domain/lineup.core';

// @FollowsBlueprint core-decision
export function hasInstrumentInAnyLineup(
  lineups: readonly Lineup[],
  memberId: string,
  instrumentId: string,
): boolean {
  return lineups.some((lineup) => instrumentsHeldBy(lineup, memberId).includes(instrumentId));
}

export function instrumentsHeldInAnyLineup(lineups: readonly Lineup[], memberId: string): string[] {
  const held = new Set<string>();
  for (const lineup of lineups) {
    for (const instrumentId of instrumentsHeldBy(lineup, memberId)) held.add(instrumentId);
  }
  return [...held];
}
