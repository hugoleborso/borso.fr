/** @Feature setlists */

export const ENERGY_DEFAULT = 5;

export interface EnergyAppearance {
  readonly filledClassName: string;
  readonly emptyClassName: string;
}

const EMPTY_SEGMENT_CLASS = 'bg-sunk border-rule-strong text-ink-soft';

const STORED_APPEARANCE: EnergyAppearance = {
  filledClassName: 'bg-accent border-accent text-on-accent',
  emptyClassName: EMPTY_SEGMENT_CLASS,
};

const UNSET_APPEARANCE: EnergyAppearance = {
  filledClassName: 'bg-ink-soft border-ink-soft text-leaf',
  emptyClassName: EMPTY_SEGMENT_CLASS,
};

const STORED_METER_APPEARANCE: EnergyAppearance = {
  filledClassName: 'bg-accent',
  emptyClassName: 'bg-rule-strong',
};

const UNSET_METER_APPEARANCE: EnergyAppearance = {
  filledClassName: 'bg-ink-soft',
  emptyClassName: 'bg-rule',
};

export interface EnergyState {
  readonly entryEnergy: number | null;
  readonly songEnergy: number | null;
}

// @FollowsBlueprint core-appearance
export function isEnergyStored(state: EnergyState): boolean {
  return state.entryEnergy !== null || state.songEnergy !== null;
}

// @FollowsBlueprint core-projection
export function resolveEnergyLevel(state: EnergyState): number {
  return state.entryEnergy ?? state.songEnergy ?? ENERGY_DEFAULT;
}

// @FollowsBlueprint core-appearance
export function selectEnergyAppearance(isStored: boolean): EnergyAppearance {
  return isStored ? STORED_APPEARANCE : UNSET_APPEARANCE;
}

// @FollowsBlueprint core-appearance
export function selectEnergyMeterAppearance(isStored: boolean): EnergyAppearance {
  return isStored ? STORED_METER_APPEARANCE : UNSET_METER_APPEARANCE;
}
