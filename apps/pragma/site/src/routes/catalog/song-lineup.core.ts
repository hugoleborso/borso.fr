/**
 * The default lineup of a song, read as rows a reader can render.
 *
 * The song stores the instruments each member holds, and the two cards in the
 * detail page's sidebar both need the same resolution: who the member is, what
 * they play, and how well they play each of it. A member holding two
 * instruments is one row carrying two instruments, because that is how the
 * lineup card reads, while the mastery card scores each instrument on its own.
 * Resolving once here keeps both cards free of `.find()` chains and makes the
 * "a member who left the band is dropped" rule something a test can state.
 * @Feature songs
 */

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

/**
 * Whether the nth bar of a ten-bar mastery meter is filled. An unknown score
 * fills nothing, which is how the meter shows "never rated".
 */
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

/** One row per instrument held, which is the grain the mastery card scores at. */
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
