/**
 * How a setlist row draws its energy control before anyone has set an energy.
 *
 * A range input always has a thumb somewhere, so the row cannot show "no
 * energy" by leaving the slider blank — it sat at the midpoint with a filled
 * track while the number beside it read an em dash, and the two said opposite
 * things. Both now read the value the control would write, and an unset row
 * says so by drawing the slider and the number in the muted palette instead of
 * the accent one.
 */

export const ENERGY_DEFAULT = 5;

export interface EnergyAppearance {
  readonly sliderClassName: string;
  readonly readoutClassName: string;
}

const STORED_APPEARANCE: EnergyAppearance = {
  sliderClassName: 'accent-accent',
  readoutClassName: 'text-ink-500',
};

const UNSET_APPEARANCE: EnergyAppearance = {
  sliderClassName: 'accent-line-strong opacity-60',
  readoutClassName: 'text-ink-300',
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
