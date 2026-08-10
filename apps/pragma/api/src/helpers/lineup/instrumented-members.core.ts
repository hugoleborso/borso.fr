/**
 * A lineup maps every band member either to the instrument they hold
 * on a song or to `null` when they sit that song out. Rules that read
 * a lineup — the mastery average, the harmonic-transition check —
 * start from the members who do hold an instrument, which is what this
 * helper answers.
 */

export type MemberId = string;
export type InstrumentId = string;
export type Lineup = Readonly<Record<MemberId, InstrumentId | null>>;

export type InstrumentedMember = readonly [MemberId, InstrumentId];

// @FollowsBlueprint helper-module
export function instrumentedMembers(lineup: Lineup): readonly InstrumentedMember[] {
  const held: InstrumentedMember[] = [];
  for (const [memberId, instrumentId] of Object.entries(lineup)) {
    if (instrumentId !== null) held.push([memberId, instrumentId]);
  }
  return held;
}
