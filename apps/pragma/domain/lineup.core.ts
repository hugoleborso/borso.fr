/**
 * The lineup vocabulary both sides of this application read.
 *
 * A lineup maps every band member either to the instrument they hold on a song
 * or to `null` when they sit that song out, and the two questions asked of one
 * are here: which lineup applies to an entry, and which members hold an
 * instrument in it.
 *
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

// @FollowsBlueprint core-projection
export function resolveLineup(defaultLineup: Lineup, overrideLineup: Lineup | null): Lineup {
  if (overrideLineup === null) return { ...defaultLineup };
  const resolved: Record<MemberId, InstrumentId | null> = { ...defaultLineup };
  for (const [memberId, instrumentId] of Object.entries(overrideLineup)) {
    resolved[memberId] = instrumentId;
  }
  return resolved;
}

export type InstrumentedMember = readonly [MemberId, InstrumentId];

/**
 * The members who hold an instrument, which is where every rule reading a
 * lineup starts: the mastery average and the harmonic transition check both
 * ignore the members sitting the song out.
 */
// @FollowsBlueprint core-projection
export function instrumentedMembers(lineup: Lineup): readonly InstrumentedMember[] {
  const held: InstrumentedMember[] = [];
  for (const [memberId, instrumentId] of Object.entries(lineup)) {
    if (instrumentId !== null) held.push([memberId, instrumentId]);
  }
  return held;
}
