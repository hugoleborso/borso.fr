/** @Feature songs */

import type { Lineup } from '@domain/lineup.core';

export interface LineupMember {
  readonly id: string;
  readonly firstName: string;
  readonly color: string;
}

export interface LineupInstrument {
  readonly id: string;
  readonly name: string;
}

export interface SongLineupInstrumentRow {
  readonly instrumentId: string;
  readonly instrumentName: string;
  readonly masteryScore: number | null;
}

export interface SongLineupRow {
  readonly memberId: string;
  readonly memberName: string;
  readonly memberColor: string;
  readonly instruments: readonly SongLineupInstrumentRow[];
}

export const MASTERY_BAR_COUNT = 10;

const NO_BARS_FILLED = 0;

export function isMasteryBarFilled(masteryScore: number | null, barIndex: number): boolean {
  return barIndex < (masteryScore ?? NO_BARS_FILLED);
}

export function buildMasteryKey(memberId: string, instrumentId: string): string {
  return `${memberId}::${instrumentId}`;
}

// @FollowsBlueprint core-view-projection
export function buildSongLineupRows(
  defaultLineup: Lineup,
  members: readonly LineupMember[],
  instruments: readonly LineupInstrument[],
  masteryByMemberInstrument: ReadonlyMap<string, number>,
): SongLineupRow[] {
  const rows: SongLineupRow[] = [];
  for (const [memberId, instrumentIds] of Object.entries(defaultLineup)) {
    const member = members.find((candidate) => candidate.id === memberId);
    if (member === undefined) continue;
    rows.push({
      memberId,
      memberName: member.firstName,
      memberColor: member.color,
      instruments: instrumentIds.flatMap((instrumentId) => {
        const instrument = instruments.find((candidate) => candidate.id === instrumentId);
        if (instrument === undefined) return [];
        return [
          {
            instrumentId,
            instrumentName: instrument.name,
            masteryScore:
              masteryByMemberInstrument.get(buildMasteryKey(memberId, instrumentId)) ?? null,
          },
        ];
      }),
    });
  }
  return rows;
}

export interface SongMasteryRow extends SongLineupInstrumentRow {
  readonly memberId: string;
  readonly memberName: string;
  readonly memberColor: string;
}

export function flattenMasteryRows(rows: readonly SongLineupRow[]): SongMasteryRow[] {
  return rows.flatMap((row) =>
    row.instruments.map((instrument) => ({
      ...instrument,
      memberId: row.memberId,
      memberName: row.memberName,
      memberColor: row.memberColor,
    })),
  );
}
