/** @Feature setlists */

export const ENERGY_DEFAULT = 5;

export interface EnergyAppearance {
  readonly filledClassName: string;
  readonly emptyClassName: string;
}

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
export function selectEnergyMeterAppearance(isStored: boolean): EnergyAppearance {
  return isStored ? STORED_METER_APPEARANCE : UNSET_METER_APPEARANCE;
}
