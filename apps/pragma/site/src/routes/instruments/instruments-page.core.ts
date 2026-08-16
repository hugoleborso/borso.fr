/**
 * What deleting an instrument does to the edit form beside the list.
 *
 * The form is bound to whichever row is selected, so deleting that row has to
 * empty it, while deleting any other row must leave a half-typed edit alone.
 *
 * Also holds the label key of each instrument family, which both the list and
 * the form read.
 * @Feature instruments
 */

import type { InstrumentFamily } from '@domain/instrument.core';

/**
 * The label of each family, as a translation key rather than a string, so the
 * page indexes this table instead of branching on the family it is drawing.
 */
export const INSTRUMENT_FAMILY_LABEL_KEY = {
  harmonic: 'instruments.familyHarmonic',
  percussive: 'instruments.familyPercussive',
  vocal: 'instruments.familyVocal',
  other: 'instruments.familyOther',
} as const satisfies Record<InstrumentFamily, string>;

export type InstrumentDeletionEffect = 'keep-form' | 'clear-form';

// @FollowsBlueprint core-view-intent
export function selectInstrumentDeletionEffect(
  selectedInstrumentId: string | null,
  deletedInstrumentId: string,
): InstrumentDeletionEffect {
  return selectedInstrumentId === deletedInstrumentId ? 'clear-form' : 'keep-form';
}
