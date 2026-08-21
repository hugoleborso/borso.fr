/** @Feature setlists */

export const ENERGY_DEFAULT = 5;

export interface EnergyAppearance {
  readonly filledClassName: string;
  readonly emptyClassName: string;
}

const EMPTY_SEGMENT_CLASS = 'bg-bg-sunk border-line-strong text-ink-500';

const STORED_APPEARANCE: EnergyAppearance = {
  filledClassName: 'bg-accent border-accent text-bg-elev',
  emptyClassName: EMPTY_SEGMENT_CLASS,
};

const UNSET_APPEARANCE: EnergyAppearance = {
  filledClassName: 'bg-ink-500 border-ink-500 text-bg-elev',
  emptyClassName: EMPTY_SEGMENT_CLASS,
};

export interface EnergyState {
  readonly isEdited: boolean;
  readonly entryEnergy: number | null;
  readonly songEnergy: number | null;
}

// @FollowsBlueprint core-appearance
export function isEnergyStored(state: EnergyState): boolean {
  return state.isEdited || state.entryEnergy !== null || state.songEnergy !== null;
}

// @FollowsBlueprint core-appearance
export function selectEnergyAppearance(isStored: boolean): EnergyAppearance {
  return isStored ? STORED_APPEARANCE : UNSET_APPEARANCE;
}
