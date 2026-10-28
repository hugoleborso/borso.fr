/** @Feature setlists */

import { ENERGY_MAX } from '@domain/input-limits.core';
import { isEnergyStored, resolveEnergyLevel } from './setlist-entry-energy.core';

const LEVELS_PER_METER_STEP = 2;
const AVERAGE_DECIMALS_FACTOR = 10;

export const ENERGY_METER_STEPS: readonly number[] = Array.from(
  { length: Math.ceil(ENERGY_MAX / LEVELS_PER_METER_STEP) },
  (_unused, index) => index + 1,
);

export interface EnergyCurveEntry {
  readonly id: string;
  readonly entryEnergy: number | null;
  readonly songEnergy: number | null;
}

export interface EnergyBar {
  readonly id: string;
  readonly level: number;
  readonly isStored: boolean;
  readonly heightRatio: number;
}

// @FollowsBlueprint utils-pure-module
export function buildEnergyBars(entries: readonly EnergyCurveEntry[]): EnergyBar[] {
  return entries.map((entry) => {
    const state = { entryEnergy: entry.entryEnergy, songEnergy: entry.songEnergy };
    const level = resolveEnergyLevel(state);
    return {
      id: entry.id,
      level,
      isStored: isEnergyStored(state),
      heightRatio: level / ENERGY_MAX,
    };
  });
}

export function averageEnergy(bars: readonly EnergyBar[]): number | null {
  if (bars.length === 0) return null;
  const total = bars.reduce((sum, bar) => sum + bar.level, 0);
  return Math.round((total / bars.length) * AVERAGE_DECIMALS_FACTOR) / AVERAGE_DECIMALS_FACTOR;
}

export function selectMeterStep(level: number): number {
  return Math.ceil(level / LEVELS_PER_METER_STEP);
}

export function projectOrder(
  orderedIds: readonly string[],
  liftedId: string,
  targetId: string | null,
): string[] {
  const fromIndex = orderedIds.indexOf(liftedId);
  const toIndex = targetId === null ? -1 : orderedIds.indexOf(targetId);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return [...orderedIds];
  const projected = orderedIds.filter((id) => id !== liftedId);
  projected.splice(toIndex, 0, liftedId);
  return projected;
}

export function arrangeByIds<Row extends { readonly id: string }>(
  rows: readonly Row[],
  orderedIds: readonly string[],
): Row[] {
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  return orderedIds.flatMap((id) => {
    const row = rowsById.get(id);
    return row === undefined ? [] : [row];
  });
}

export function selectEnergyBarClass(bar: EnergyBar, liftedId: string | null): string {
  if (bar.id === liftedId) return 'bg-accent';
  return bar.isStored ? 'bg-ink-soft' : 'bg-rule-strong';
}
