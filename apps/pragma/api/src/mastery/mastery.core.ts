import { type Lineup, memberInstrumentPairs } from '@domain/lineup.core';

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

export function meanForSong(
  defaults: DefaultMap,
  overrides: OverrideMap,
  songId: SongId,
  lineup: Lineup,
): number | null {
  const scores: number[] = [];
  for (const [memberId, instrumentId] of memberInstrumentPairs(lineup)) {
    const score = effective(defaults, overrides, { memberId, instrumentId, songId });
    if (score === null) continue;
    scores.push(score);
  }
  if (scores.length === 0) return null;
  const sum = scores.reduce((accumulator, score) => accumulator + score, 0);
  return sum / scores.length;
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
