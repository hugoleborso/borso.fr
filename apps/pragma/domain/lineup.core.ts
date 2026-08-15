/**
 * The lineup vocabulary both sides of this application read.
 *
 * A lineup maps every band member to the instruments they hold on a song. One
 * person can hold several at once — a drummer who also sings is one member
 * holding two instruments, and the transition rule has to see both — so the
 * value is a list, and an empty list means the member sits that song out.
 *
 * Rows written before this shape existed carry a single instrument id, or
 * `null` for a member sitting out. `normalizeLineup` accepts either form and
 * always yields lists, so nothing has to rewrite the stored JSON.
 *
 * Lineup resolution between a song's `defaultLineup` and a setlist entry's
 * per-entry `lineupOverride` keeps three null shapes apart:
 *
 *   1. The member is absent from the override → fall back to the default.
 *   2. The override maps the member to an empty list → the member sits out
 *      explicitly (cleared on this song).
 *   3. The override maps the member to instruments → those win.
 *
 * The default is always preserved when the override has no opinion on a member.
 *
 * Pure functions over plain objects.
 */

export type MemberId = string;
export type InstrumentId = string;
export type Lineup = Readonly<Record<MemberId, readonly InstrumentId[]>>;

/**
 * What a stored lineup can look like: the current list form, or the single-id
 * and `null` forms written before a member could hold two instruments.
 */
export type StoredLineupValue = InstrumentId | readonly InstrumentId[] | null;
export type StoredLineup = Readonly<Record<MemberId, StoredLineupValue>>;

function normalizeLineupValue(value: StoredLineupValue): readonly InstrumentId[] {
  if (value === null) return [];
  if (typeof value === 'string') return value.length === 0 ? [] : [value];
  return value.filter((instrumentId) => instrumentId.length > 0);
}

// @FollowsBlueprint core-projection
export function normalizeLineup(stored: StoredLineup): Lineup {
  const normalized: Record<MemberId, readonly InstrumentId[]> = {};
  for (const [memberId, value] of Object.entries(stored)) {
    normalized[memberId] = normalizeLineupValue(value);
  }
  return normalized;
}

// @FollowsBlueprint core-projection
export function resolveLineup(defaultLineup: Lineup, overrideLineup: Lineup | null): Lineup {
  if (overrideLineup === null) return { ...defaultLineup };
  const resolved: Record<MemberId, readonly InstrumentId[]> = { ...defaultLineup };
  for (const [memberId, instrumentIds] of Object.entries(overrideLineup)) {
    resolved[memberId] = instrumentIds;
  }
  return resolved;
}

export type InstrumentedMember = readonly [MemberId, readonly InstrumentId[]];

/**
 * The members who hold at least one instrument, which is where every rule
 * reading a lineup starts: the mastery average and the transition check both
 * ignore the members sitting the song out.
 */
// @FollowsBlueprint core-projection
export function instrumentedMembers(lineup: Lineup): readonly InstrumentedMember[] {
  const held: InstrumentedMember[] = [];
  for (const [memberId, instrumentIds] of Object.entries(lineup)) {
    if (instrumentIds.length > 0) held.push([memberId, instrumentIds]);
  }
  return held;
}

export type MemberInstrumentPair = readonly [MemberId, InstrumentId];

/**
 * One pair per instrument held, which is the grain mastery is scored at: a
 * member holding two instruments is rated on each of them separately.
 */
// @FollowsBlueprint core-projection
export function memberInstrumentPairs(lineup: Lineup): readonly MemberInstrumentPair[] {
  const pairs: MemberInstrumentPair[] = [];
  for (const [memberId, instrumentIds] of instrumentedMembers(lineup)) {
    for (const instrumentId of instrumentIds) pairs.push([memberId, instrumentId]);
  }
  return pairs;
}

/** The instruments a member holds, whether or not the lineup names them. */
export function instrumentsHeldBy(lineup: Lineup, memberId: MemberId): readonly InstrumentId[] {
  return lineup[memberId] ?? [];
}
