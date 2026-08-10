/**
 * Pure decisions the preview fixture makes: resolving seed instrument
 * names to the identifiers the writes returned, and reporting whether
 * the seed created the admin credentials or found them already set.
 */

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
