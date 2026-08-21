/** @Feature instruments */

import type { InstrumentFamily } from '@domain/instrument.core';

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
