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
} satisfies Record<InstrumentIcon, IconName>;

export const SLOTS_BEYOND_MEMBER_COUNT = 2;
export const MINIMUM_OVERFLOW_WORTH_A_COUNTER = 1;
export const EMPTY_LINEUP_SLOT_COLOR = 'var(--color-ink-300)';
export const LINEUP_SLOT_WIDTH_PX = 19;
export const OVERFLOW_COUNTER_WIDTH_PX = 22;

export interface SlotInstrument {
  readonly id: string;
  readonly name: string;
  readonly icon: InstrumentIcon;
  readonly position: number;
  readonly players: readonly { readonly memberId: string; readonly isPrimary: boolean }[];
}

export interface SlotMember {
  readonly id: string;
  readonly color: string;
}

export interface LineupSlot {
  readonly instrumentId: string;
  readonly instrumentName: string;
  readonly glyph: IconName;
  readonly holderColor: string | null;
}

export interface LineupColumnView {
  readonly slots: readonly LineupSlot[];
  readonly cappedInstrumentNames: readonly string[];
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

function hasOverflowWorthShowing(overflowCount: number): boolean {
  return overflowCount >= MINIMUM_OVERFLOW_WORTH_A_COUNTER;
}

function hasPrimaryPlayer(instrument: SlotInstrument): boolean {
  return instrument.players.some((player) => player.isPrimary);
}

export function selectColumnInstruments(
  instruments: readonly SlotInstrument[],
): readonly SlotInstrument[] {
  const primaryOnes = instruments.filter(hasPrimaryPlayer);
  return primaryOnes.length > 0 ? primaryOnes : instruments;
}

export function resolveSlotBudget(memberCount: number): number {
  return memberCount + SLOTS_BEYOND_MEMBER_COUNT;
}

function findHolderColor(
  instrumentId: string,
  lineup: Readonly<Record<string, readonly string[]>>,
  members: readonly SlotMember[],
): string | null {
  for (const member of members) {
    if (lineup[member.id]?.includes(instrumentId) === true) return member.color;
  }
  return null;
}

// @FollowsBlueprint core-projection
export function buildLineupColumn(input: BuildLineupColumnInput): LineupColumnView {
  const column = selectColumnInstruments(input.instruments).toSorted(byPositionThenName);
  const budget = resolveSlotBudget(input.members.length);
  return {
    slots: column.slice(0, budget).map((instrument) => ({
      instrumentId: instrument.id,
      instrumentName: instrument.name,
      glyph: INSTRUMENT_ICON_GLYPH[instrument.icon],
      holderColor: findHolderColor(instrument.id, input.lineup, input.members),
    })),
    cappedInstrumentNames: column.slice(budget).map((instrument) => instrument.name),
  };
}

export function naturalColumnWidth(column: LineupColumnView): number {
  const counterWidth = column.cappedInstrumentNames.length > 0 ? OVERFLOW_COUNTER_WIDTH_PX : 0;
  return column.slots.length * LINEUP_SLOT_WIDTH_PX + counterWidth;
}

export function slotsFittingWidth(
  slotCount: number,
  availableWidthPx: number | null,
  isCounterAlreadyOwed: boolean,
): number {
  if (availableWidthPx === null) return slotCount;
  const reservedForCounter = isCounterAlreadyOwed ? OVERFLOW_COUNTER_WIDTH_PX : 0;
  if (slotCount * LINEUP_SLOT_WIDTH_PX <= availableWidthPx - reservedForCounter) return slotCount;
  const roomBesideTheCounter = availableWidthPx - OVERFLOW_COUNTER_WIDTH_PX;
  return Math.max(0, Math.floor(roomBesideTheCounter / LINEUP_SLOT_WIDTH_PX));
}

// @FollowsBlueprint core-projection
export function sliceColumnToWidth(
  column: LineupColumnView,
  availableWidthPx: number | null,
): LineupSlotsView {
  const fitting = slotsFittingWidth(
    column.slots.length,
    availableWidthPx,
    column.cappedInstrumentNames.length > 0,
  );
  const overflowInstrumentNames = [
    ...column.slots.slice(fitting).map((slot) => slot.instrumentName),
    ...column.cappedInstrumentNames,
  ];
  return {
    slots: column.slots.slice(0, fitting),
    overflowCount: overflowInstrumentNames.length,
    hasOverflow: hasOverflowWorthShowing(overflowInstrumentNames.length),
    overflowInstrumentNames,
  };
}

export function slotTintColor(holderColor: string | null): string {
  return holderColor ?? EMPTY_LINEUP_SLOT_COLOR;
}
