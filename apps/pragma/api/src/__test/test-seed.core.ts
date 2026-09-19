import type { Lineup } from '@domain/lineup.core';

export type SeedLineupByMemberName = Readonly<Record<string, readonly string[]>>;

const PRIMARY_INSTRUMENTS_PER_SEEDED_MEMBER = 1;

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

// @FollowsBlueprint core-projection
export function selectPrimaryInstrumentIds(
  instrumentNames: readonly string[],
  instrumentIdByName: ReadonlyMap<string, string>,
): string[] {
  return selectInstrumentIds(instrumentNames, instrumentIdByName).slice(
    0,
    PRIMARY_INSTRUMENTS_PER_SEEDED_MEMBER,
  );
}

export type AdminCredentialsState = 'created' | 'already-set';

export function selectAdminCredentialsState(
  bootstrapKind: 'ok' | 'already-bootstrapped',
): AdminCredentialsState {
  return bootstrapKind === 'ok' ? 'created' : 'already-set';
}
