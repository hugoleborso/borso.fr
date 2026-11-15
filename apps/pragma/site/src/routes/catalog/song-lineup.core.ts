/** @Feature songs */

import type { InstrumentIcon } from '@domain/instrument.core';
import type { Lineup } from '@domain/lineup.core';

export interface LineupMember {
  readonly id: string;
  readonly firstName: string;
  readonly color: string;
}

export interface LineupInstrument {
  readonly id: string;
  readonly name: string;
  readonly icon: InstrumentIcon;
}

export interface SongLineupInstrumentRow {
  readonly instrumentId: string;
  readonly instrumentName: string;
  readonly icon: InstrumentIcon;
}

export interface SongLineupRow {
  readonly memberId: string;
  readonly memberName: string;
  readonly memberColor: string;
  readonly instruments: readonly SongLineupInstrumentRow[];
}

// @FollowsBlueprint core-view-projection
export function buildSongLineupRows(
  defaultLineup: Lineup,
  members: readonly LineupMember[],
  instruments: readonly LineupInstrument[],
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
        return [{ instrumentId, instrumentName: instrument.name, icon: instrument.icon }];
      }),
    });
  }
  return rows;
}
