export type MemberId = string;
export type InstrumentId = string;
export type SongId = string;

export type DefaultMap = Readonly<Record<MemberId, Readonly<Record<InstrumentId, number>>>>;
export type OverrideMap = Readonly<
  Record<SongId, Readonly<Record<MemberId, Readonly<Record<InstrumentId, number>>>>>
>;

export interface MasteryQuery {
  readonly memberId: MemberId;
  readonly instrumentId: InstrumentId;
  readonly songId: SongId;
}

// @FollowsBlueprint core-decision
export function effective(
  defaults: DefaultMap,
  overrides: OverrideMap,
  query: MasteryQuery,
): number | null {
  const override = overrides[query.songId]?.[query.memberId]?.[query.instrumentId];
  if (override !== undefined) return override;
  const fallback = defaults[query.memberId]?.[query.instrumentId];
  return fallback ?? null;
}

export function isRedundantOverride(
  defaults: DefaultMap,
  overrides: OverrideMap,
  query: MasteryQuery,
): boolean {
  const override = overrides[query.songId]?.[query.memberId]?.[query.instrumentId];
  if (override === undefined) return false;
  const fallback = defaults[query.memberId]?.[query.instrumentId];
  return fallback === override;
}

export interface DefaultScoreRow {
  readonly memberId: MemberId;
  readonly instrumentId: InstrumentId;
  readonly score: number;
}

export interface OverrideScoreRow extends DefaultScoreRow {
  readonly songId: SongId;
}

// @FollowsBlueprint core-projection
export function indexDefaultScores(rows: readonly DefaultScoreRow[]): DefaultMap {
  const indexed: Record<MemberId, Record<InstrumentId, number>> = {};
  for (const row of rows) {
    indexed[row.memberId] = { ...indexed[row.memberId], [row.instrumentId]: row.score };
  }
  return indexed;
}

export function indexOverrideScores(rows: readonly OverrideScoreRow[]): OverrideMap {
  const indexed: Record<SongId, Record<MemberId, Record<InstrumentId, number>>> = {};
  for (const row of rows) {
    const ofSong = indexed[row.songId] ?? {};
    ofSong[row.memberId] = { ...ofSong[row.memberId], [row.instrumentId]: row.score };
    indexed[row.songId] = ofSong;
  }
  return indexed;
}
