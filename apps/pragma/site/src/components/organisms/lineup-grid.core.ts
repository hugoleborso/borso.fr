/** @Feature setlists */

import type { InstrumentFamily, InstrumentIcon } from '@domain/instrument.core';
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
  readonly family: InstrumentFamily;
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
  readonly previousGlyphs: readonly LineupGridGlyph[];
  readonly isPlaying: boolean;
  readonly isChanged: boolean;
  readonly joinsPrevious: boolean;
  readonly joinsNext: boolean;
}

export interface LineupGridRow {
  readonly entryId: string;
  readonly position: number;
  readonly title: string;
  readonly cells: readonly LineupGridCell[];
  readonly changeCount: number;
  readonly isCompact: boolean;
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

const VOCAL_FAMILY: InstrumentFamily = 'vocal';

interface MemberHold {
  readonly held: readonly string[];
  readonly hands: readonly string[];
}

interface LineupChange {
  readonly isChanged: boolean;
  readonly previousGlyphs: readonly LineupGridGlyph[];
}

const NO_CHANGE: LineupChange = { isChanged: false, previousGlyphs: [] };

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

function describeHold(lineup: Lineup, memberId: string, vocalIds: ReadonlySet<string>): MemberHold {
  const held = instrumentsHeldBy(lineup, memberId);
  return { held, hands: held.filter((instrumentId) => !vocalIds.has(instrumentId)) };
}

function isSameRun(current: MemberHold, other: MemberHold | undefined): boolean {
  if (other === undefined) return false;
  return (
    current.held.length > 0 &&
    other.held.length > 0 &&
    isSameInstrumentSet(current.hands, other.hands)
  );
}

function describeChange(
  current: MemberHold,
  previous: MemberHold | undefined,
  orderedInstruments: readonly LineupGridInstrument[],
): LineupChange {
  if (previous === undefined || current.held.length === 0) return NO_CHANGE;
  if (isSameInstrumentSet(current.hands, previous.hands)) return NO_CHANGE;
  return { isChanged: true, previousGlyphs: orderGlyphs(previous.hands, orderedInstruments) };
}

export function hasLineupChanges(row: LineupGridRow): boolean {
  return row.changeCount > 0;
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
  const vocalIds = new Set(
    input.instruments
      .filter((instrument) => instrument.family === VOCAL_FAMILY)
      .map((instrument) => instrument.id),
  );
  const holds = resolved.map(({ lineup }) =>
    columns.map((column) => describeHold(lineup, column.memberId, vocalIds)),
  );
  const rows = resolved.map(({ entry, lineup }, index): LineupGridRow => {
    const cells = columns.map((column, columnIndex): LineupGridCell => {
      const current = describeHold(lineup, column.memberId, vocalIds);
      const previous = holds[index - 1]?.[columnIndex];
      const next = holds[index + 1]?.[columnIndex];
      return {
        memberId: column.memberId,
        firstName: column.firstName,
        color: column.color,
        glyphs: orderGlyphs(current.held, orderedInstruments),
        ...describeChange(current, previous, orderedInstruments),
        isPlaying: current.held.length > 0,
        joinsPrevious: isSameRun(current, previous),
        joinsNext: isSameRun(current, next),
      };
    });
    const changeCount = cells.filter((cell) => cell.isChanged).length;
    return {
      entryId: entry.id,
      position: index + 1,
      title: input.songsById[entry.songId]?.title ?? '',
      cells,
      changeCount,
      isCompact: index > 0 && changeCount === 0,
    };
  });
  return { columns, rows };
}
