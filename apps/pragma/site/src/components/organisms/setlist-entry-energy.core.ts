/**
 * How a setlist row draws its energy control before anyone has set an energy.
 *
 * The bar always fills up to some level, so the row cannot show "no energy" by
 * leaving it blank — it sat at the midpoint with a filled bar while the number
 * beside it read an em dash, and the two said opposite things. Both now read
 * the value the control would write, and an unset row says so by drawing the
 * filled segments and the number in the muted palette instead of the accent
 * one.
 * @Feature setlists
 */

export const ENERGY_DEFAULT = 5;

export interface EnergyAppearance {
  readonly filledClassName: string;
  readonly emptyClassName: string;
  readonly readoutClassName: string;
}

const EMPTY_SEGMENT_CLASS = 'bg-bg-sunk';

const STORED_APPEARANCE: EnergyAppearance = {
  filledClassName: 'bg-accent',
  emptyClassName: EMPTY_SEGMENT_CLASS,
  readoutClassName: 'text-ink-500',
};

const UNSET_APPEARANCE: EnergyAppearance = {
  filledClassName: 'bg-line-strong',
  emptyClassName: EMPTY_SEGMENT_CLASS,
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
