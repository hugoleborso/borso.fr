/** @Feature setlists */

import { type Lineup, instrumentsHeldBy, resolveLineup } from '@domain/lineup.core';
import { type LineupFormValues, toggleInstrumentHeld } from '../molecules/lineup-editor.core';

export interface EntryLineupMember {
  readonly id: string;
  readonly firstName: string;
  readonly color: string;
}

export interface EntryLineupInstrument {
  readonly id: string;
  readonly name: string;
}

export interface EntryLineupInput {
  readonly songDefaultLineup: Lineup;
  readonly lineupOverride: Lineup | null;
  readonly members: readonly EntryLineupMember[];
  readonly instruments: readonly EntryLineupInstrument[];
}

export interface EntryLineupRow {
  readonly memberId: string;
  readonly firstName: string;
  readonly color: string;
  readonly heldInstrumentIds: readonly string[];
  readonly heldInstrumentNames: readonly string[];
  readonly isChangedTonight: boolean;
}

function isSameInstrumentSet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((instrumentId) => right.includes(instrumentId));
}

// @FollowsBlueprint core-projection
export function describeEntryLineup(input: EntryLineupInput): readonly EntryLineupRow[] {
  const tonight = resolveLineup(input.songDefaultLineup, input.lineupOverride);
  return input.members.map((member) => {
    const held = instrumentsHeldBy(tonight, member.id);
    return {
      memberId: member.id,
      firstName: member.firstName,
      color: member.color,
      heldInstrumentIds: held,
      heldInstrumentNames: input.instruments
        .filter((instrument) => held.includes(instrument.id))
        .map((instrument) => instrument.name),
      isChangedTonight: !isSameInstrumentSet(
        held,
        instrumentsHeldBy(input.songDefaultLineup, member.id),
      ),
    };
  });
}

export function listLineupChangesTonight(input: EntryLineupInput): readonly EntryLineupRow[] {
  return describeEntryLineup(input).filter((row) => row.isChangedTonight);
}

export function toggleTonightInstrument(
  rows: readonly EntryLineupRow[],
  memberId: string,
  instrumentId: string,
): LineupFormValues {
  const values: LineupFormValues = {};
  for (const row of rows) {
    values[row.memberId] =
      row.memberId === memberId
        ? toggleInstrumentHeld(row.heldInstrumentIds, instrumentId)
        : [...row.heldInstrumentIds];
  }
  return values;
}

export interface LineupChangesEntry {
  readonly id: string;
  readonly songId: string;
  readonly lineupOverride: Lineup | null;
}

export interface LineupChangesInput {
  readonly entries: readonly LineupChangesEntry[];
  readonly songsById: Readonly<Record<string, { readonly defaultLineup: Lineup }>>;
  readonly members: readonly EntryLineupMember[];
  readonly instruments: readonly EntryLineupInstrument[];
}

export function indexLineupChangesTonight(
  input: LineupChangesInput,
): Readonly<Record<string, readonly EntryLineupRow[]>> {
  return Object.fromEntries(
    input.entries.map((entry) => [
      entry.id,
      listLineupChangesTonight({
        songDefaultLineup: input.songsById[entry.songId]?.defaultLineup ?? {},
        lineupOverride: entry.lineupOverride,
        members: input.members,
        instruments: input.instruments,
      }),
    ]),
  );
}
