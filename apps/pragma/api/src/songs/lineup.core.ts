/**
 * Lineup resolution between a song's `defaultLineup` and a setlist
 * entry's per-entry `lineupOverride`. Three null shapes must be
 * disambiguated:
 *
 *   1. The member is absent from the override → fall back to the default.
 *   2. The override maps the member to `null` → the member sits out
 *      explicitly (cleared on this song).
 *   3. The override maps the member to an instrument id → that
 *      instrument wins.
 *
 * The default is always preserved when the override has no opinion
 * on a member.
 *
 * Pure function over plain objects.
 */

export type MemberId = string;
export type InstrumentId = string;
export type Lineup = Readonly<Record<MemberId, InstrumentId | null>>;

export function resolveLineup(
  defaultLineup: Lineup,
  overrideLineup: Lineup | null,
): Lineup {
  if (overrideLineup === null) return { ...defaultLineup };
  const resolved: Record<MemberId, InstrumentId | null> = { ...defaultLineup };
  for (const [memberId, instrumentId] of Object.entries(overrideLineup)) {
    resolved[memberId] = instrumentId;
  }
  return resolved;
}
