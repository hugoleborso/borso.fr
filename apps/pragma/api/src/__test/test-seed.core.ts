/**
 * Pure decisions the preview fixture makes: resolving seed instrument
 * names to the identifiers the writes returned, turning a lineup
 * written by name into one written by identifier, and reporting whether
 * the seed created the admin credentials or found them already set.
 */

import type { Lineup } from '@domain/lineup.core';

export type SeedLineupByMemberName = Readonly<Record<string, readonly string[]>>;

/**
 * The fixture names members and instruments; the database wants ids. A name
 * neither map knows is dropped rather than written as a dangling id, which is
 * what keeps a typo in the fixture from seeding an orphan lineup entry.
 */
// @FollowsBlueprint core-projection
export function buildSeedLineup(
  lineupByMemberName: SeedLineupByMemberName,
  memberIdByName: ReadonlyMap<string, string>,
  instrumentIdByName: ReadonlyMap<string, string>,
): Lineup {
  const lineup: Record<string, readonly string[]> = {};
  for (const [memberName, instrumentNames] of Object.entries(lineupByMemberName)) {
    const memberId = memberIdByName.get(memberName);
    if (memberId === undefined) continue;
    lineup[memberId] = selectInstrumentIds(instrumentNames, instrumentIdByName);
  }
  return lineup;
}

// @FollowsBlueprint core-projection
export function selectInstrumentIds(
  instrumentNames: readonly string[],
  instrumentIdByName: ReadonlyMap<string, string>,
): string[] {
  return instrumentNames.flatMap((name) => {
    const instrumentId = instrumentIdByName.get(name);
    return instrumentId === undefined ? [] : [instrumentId];
  });
}

export type AdminCredentialsState = 'created' | 'already-set';

export function selectAdminCredentialsState(
  bootstrapKind: 'ok' | 'already-bootstrapped',
): AdminCredentialsState {
  return bootstrapKind === 'ok' ? 'created' : 'already-set';
}
