/**
 * How a setlist row draws its energy control before anyone has set an energy.
 *
 * The bar always fills up to some level, so the row cannot show "no energy" by
 * leaving it blank: a filled bar beside a number reading an em dash is two
 * controls saying opposite things. Both read the value the control would
 * write, and an unset row says so by drawing its filled segments in the muted
 * palette rather than the accent one.
 * @Feature setlists
 */

export const ENERGY_DEFAULT = 5;

export interface EnergyAppearance {
  readonly filledClassName: string;
  readonly emptyClassName: string;
}

/**
 * A filled segment has to be told from an empty one at 3:1, which is what WCAG
 * 1.4.11 asks of a control's own state, and the muted palette's `line-strong`
 * reaches 1.36:1 against the track in the light theme. `ink-500` is the
 * lightest token that clears the ratio in both themes while still reading as
 * the neutral half of neutral-against-accent, and it carries the numeral at
 * 4.5:1 against the empty track in both themes too.
 */
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
