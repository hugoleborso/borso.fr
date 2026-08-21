export type MemberId = string;
export type InstrumentId = string;
export type Lineup = Readonly<Record<MemberId, readonly InstrumentId[]>>;

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

// @FollowsBlueprint core-projection
export function instrumentedMembers(lineup: Lineup): readonly InstrumentedMember[] {
  const held: InstrumentedMember[] = [];
  for (const [memberId, instrumentIds] of Object.entries(lineup)) {
    if (instrumentIds.length > 0) held.push([memberId, instrumentIds]);
  }
  return held;
}

export type MemberInstrumentPair = readonly [MemberId, InstrumentId];

// @FollowsBlueprint core-projection
export function memberInstrumentPairs(lineup: Lineup): readonly MemberInstrumentPair[] {
  const pairs: MemberInstrumentPair[] = [];
  for (const [memberId, instrumentIds] of instrumentedMembers(lineup)) {
    for (const instrumentId of instrumentIds) pairs.push([memberId, instrumentId]);
  }
  return pairs;
}

export function instrumentsHeldBy(lineup: Lineup, memberId: MemberId): readonly InstrumentId[] {
  return lineup[memberId] ?? [];
}
