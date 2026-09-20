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

export interface LineupSlotsView {
  readonly slots: readonly LineupSlot[];
  readonly overflowCount: number;
  readonly hasOverflow: boolean;
  readonly overflowInstrumentNames: readonly string[];
}

export interface BuildLineupSlotsInput {
  readonly instruments: readonly SlotInstrument[];
  readonly lineup: Readonly<Record<string, readonly string[]>>;
  readonly members: readonly SlotMember[];
  readonly maximumVisibleSlots: number;
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

export function resolveSlotBudget(memberCount: number, maximumVisibleSlots: number): number {
  return Math.min(memberCount + SLOTS_BEYOND_MEMBER_COUNT, maximumVisibleSlots);
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
export function buildLineupSlots(input: BuildLineupSlotsInput): LineupSlotsView {
  const column = selectColumnInstruments(input.instruments).toSorted(byPositionThenName);
  const budget = resolveSlotBudget(input.members.length, input.maximumVisibleSlots);
  const visible = column.slice(0, budget);
  const dropped = column.slice(budget);
  return {
    slots: visible.map((instrument) => ({
      instrumentId: instrument.id,
      instrumentName: instrument.name,
      glyph: INSTRUMENT_ICON_GLYPH[instrument.icon],
      holderColor: findHolderColor(instrument.id, input.lineup, input.members),
    })),
    overflowCount: dropped.length,
    hasOverflow: hasOverflowWorthShowing(dropped.length),
    overflowInstrumentNames: dropped.map((instrument) => instrument.name),
  };
}

export function slotTintColor(holderColor: string | null): string {
  return holderColor ?? EMPTY_LINEUP_SLOT_COLOR;
}
