/** @Feature setlists */

import type { InstrumentIcon } from '@domain/instrument.core';
import type { IconName } from '../atoms/Icon';

export const INSTRUMENT_ICON_GLYPH = {
  'mic-vocal': 'micVocal',
  guitar: 'guitar',
  bass: 'bass',
  piano: 'piano',
  drum: 'drum',
  music: 'music',
  choir: 'choir',
  brass: 'brass',
  wind: 'wind',
  strings: 'strings',
  synth: 'synth',
  stage: 'stage',
  sparkles: 'sparkles',
  heart: 'heart',
  flame: 'flame',
  lightning: 'lightning',
  crown: 'crown',
  sun: 'sun',
} satisfies Record<InstrumentIcon, IconName>;

export const LINEUP_SLOT_WIDTH_PX = 19;
export const OVERFLOW_COUNTER_WIDTH_PX = 22;
const NO_OVERFLOW = 0;

export interface SlotInstrument {
  readonly id: string;
  readonly name: string;
  readonly icon: InstrumentIcon;
  readonly position: number;
}

export interface SlotMember {
  readonly id: string;
  readonly color: string;
}

export interface LineupSlot {
  readonly slotKey: string;
  readonly instrumentName: string;
  readonly glyph: IconName;
  readonly holderColor: string;
}

export interface LineupColumnView {
  readonly slots: readonly LineupSlot[];
}

export interface LineupSlotsView {
  readonly slots: readonly LineupSlot[];
  readonly overflowCount: number;
  readonly hasOverflow: boolean;
  readonly overflowInstrumentNames: readonly string[];
}

export interface BuildLineupColumnInput {
  readonly instruments: readonly SlotInstrument[];
  readonly lineup: Readonly<Record<string, readonly string[]>>;
  readonly members: readonly SlotMember[];
}

function byPositionThenName(left: SlotInstrument, right: SlotInstrument): number {
  if (left.position !== right.position) return left.position - right.position;
  return left.name.localeCompare(right.name);
}

// @FollowsBlueprint core-projection
export function buildLineupColumn(input: BuildLineupColumnInput): LineupColumnView {
  const slots = input.instruments.toSorted(byPositionThenName).flatMap((instrument) =>
    input.members
      .filter((member) => input.lineup[member.id]?.includes(instrument.id) === true)
      .map((member): LineupSlot => ({
        slotKey: `${instrument.id}:${member.id}`,
        instrumentName: instrument.name,
        glyph: INSTRUMENT_ICON_GLYPH[instrument.icon],
        holderColor: member.color,
      })),
  );
  return { slots };
}

export function naturalColumnWidth(column: LineupColumnView): number {
  return column.slots.length * LINEUP_SLOT_WIDTH_PX;
}

export function slotsFittingWidth(slotCount: number, availableWidthPx: number | null): number {
  if (availableWidthPx === null) return slotCount;
  if (slotCount * LINEUP_SLOT_WIDTH_PX <= availableWidthPx) return slotCount;
  const roomBesideTheCounter = availableWidthPx - OVERFLOW_COUNTER_WIDTH_PX;
  return Math.max(0, Math.floor(roomBesideTheCounter / LINEUP_SLOT_WIDTH_PX));
}

// @FollowsBlueprint core-projection
export function sliceColumnToWidth(
  column: LineupColumnView,
  availableWidthPx: number | null,
): LineupSlotsView {
  const fitting = slotsFittingWidth(column.slots.length, availableWidthPx);
  const overflowInstrumentNames = column.slots.slice(fitting).map((slot) => slot.instrumentName);
  return {
    slots: column.slots.slice(0, fitting),
    overflowCount: overflowInstrumentNames.length,
    hasOverflow: overflowInstrumentNames.length > NO_OVERFLOW,
    overflowInstrumentNames,
  };
}
