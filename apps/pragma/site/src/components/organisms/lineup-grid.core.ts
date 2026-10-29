/** @Feature setlists */

import type { InstrumentIcon } from '@domain/instrument.core';
import { type Lineup, instrumentsHeldBy, resolveLineup } from '@domain/lineup.core';
import type { IconName } from '../atoms/Icon';
import { INSTRUMENT_ICON_GLYPH } from '../molecules/lineup-slots.core';

export interface LineupGridMember {
  readonly id: string;
  readonly firstName: string;
  readonly color: string;
}

export interface LineupGridInstrument {
  readonly id: string;
  readonly name: string;
  readonly icon: InstrumentIcon;
  readonly position: number;
}

export interface LineupGridEntry {
  readonly id: string;
  readonly songId: string;
  readonly lineupOverride: Lineup | null;
}

export interface LineupGridSong {
  readonly title: string;
  readonly defaultLineup: Lineup;
}

export interface LineupGridInput {
  readonly entries: readonly LineupGridEntry[];
  readonly songsById: Readonly<Record<string, LineupGridSong>>;
  readonly members: readonly LineupGridMember[];
  readonly instruments: readonly LineupGridInstrument[];
}

export interface LineupGridColumn {
  readonly memberId: string;
  readonly firstName: string;
  readonly color: string;
}

export interface LineupGridGlyph {
  readonly instrumentId: string;
  readonly name: string;
  readonly glyph: IconName;
}

export interface LineupGridCell {
  readonly memberId: string;
  readonly firstName: string;
  readonly color: string;
  readonly glyphs: readonly LineupGridGlyph[];
  readonly isPlaying: boolean;
  readonly isChanged: boolean;
}

export interface LineupGridRow {
  readonly entryId: string;
  readonly position: number;
  readonly title: string;
  readonly cells: readonly LineupGridCell[];
}

export interface LineupGrid {
  readonly columns: readonly LineupGridColumn[];
  readonly rows: readonly LineupGridRow[];
}

function byPositionThenName(left: LineupGridInstrument, right: LineupGridInstrument): number {
  if (left.position !== right.position) return left.position - right.position;
  return left.name.localeCompare(right.name);
}

function resolveEntryLineup(
  entry: LineupGridEntry,
  songsById: Readonly<Record<string, LineupGridSong>>,
): Lineup {
  return resolveLineup(songsById[entry.songId]?.defaultLineup ?? {}, entry.lineupOverride);
}

function isSameInstrumentSet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((instrumentId) => right.includes(instrumentId));
}

function orderGlyphs(
  heldIds: readonly string[],
  orderedInstruments: readonly LineupGridInstrument[],
): readonly LineupGridGlyph[] {
  return orderedInstruments
    .filter((instrument) => heldIds.includes(instrument.id))
    .map((instrument) => ({
      instrumentId: instrument.id,
      name: instrument.name,
      glyph: INSTRUMENT_ICON_GLYPH[instrument.icon],
    }));
}

// @FollowsBlueprint core-projection
export function buildLineupGrid(input: LineupGridInput): LineupGrid {
  const resolved = input.entries.map((entry) => ({
    entry,
    lineup: resolveEntryLineup(entry, input.songsById),
  }));
  const columns = input.members
    .filter((member) =>
      resolved.some(({ lineup }) => instrumentsHeldBy(lineup, member.id).length > 0),
    )
    .map((member) => ({ memberId: member.id, firstName: member.firstName, color: member.color }));
  const orderedInstruments = input.instruments.toSorted(byPositionThenName);
  const rows = resolved.map(({ entry, lineup }, index): LineupGridRow => {
    const previousLineup = resolved[index - 1]?.lineup ?? lineup;
    return {
      entryId: entry.id,
      position: index + 1,
      title: input.songsById[entry.songId]?.title ?? '',
      cells: columns.map((column): LineupGridCell => {
        const held = instrumentsHeldBy(lineup, column.memberId);
        const isPlaying = held.length > 0;
        const heldBefore = instrumentsHeldBy(previousLineup, column.memberId);
        return {
          memberId: column.memberId,
          firstName: column.firstName,
          color: column.color,
          glyphs: orderGlyphs(held, orderedInstruments),
          isPlaying,
          isChanged: isPlaying && !isSameInstrumentSet(held, heldBefore),
        };
      }),
    };
  });
  return { columns, rows };
}
