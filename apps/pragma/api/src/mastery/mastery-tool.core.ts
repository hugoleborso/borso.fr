import { type LineupNames, nameEntity } from '../instruments/lineup-names.core';

export interface ScoreRow {
  readonly memberId: string;
  readonly instrumentId: string;
  readonly score: number;
}

export interface ScoreChangeRow extends ScoreRow {
  readonly changedAt: Date;
}

export interface NamedScore {
  readonly member: string;
  readonly instrument: string;
  readonly score: number;
}

function nameScore(row: ScoreRow, names: LineupNames): NamedScore {
  return {
    member: nameEntity(names.members, row.memberId),
    instrument: nameEntity(names.instruments, row.instrumentId),
    score: row.score,
  };
}

// @FollowsBlueprint core-projection
export function nameScores(
  rows: readonly ScoreRow[],
  names: LineupNames,
  memberId: string | undefined,
): NamedScore[] {
  return rows
    .filter((row) => memberId === undefined || row.memberId === memberId)
    .map((row) => nameScore(row, names));
}

// @FollowsBlueprint core-projection
export function nameScoreChanges(
  rows: readonly ScoreChangeRow[],
  names: LineupNames,
): (NamedScore & { readonly at: string })[] {
  return rows.map((row) => ({ ...nameScore(row, names), at: row.changedAt.toISOString() }));
}
