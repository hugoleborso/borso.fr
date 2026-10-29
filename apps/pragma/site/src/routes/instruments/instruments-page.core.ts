/** @Feature instruments */

import type { InstrumentFamily, InstrumentIcon } from '@domain/instrument.core';

export const INSTRUMENT_ICON_LABEL_KEY = {
  'mic-vocal': 'instruments.iconMicVocal',
  guitar: 'instruments.iconGuitar',
  bass: 'instruments.iconBass',
  piano: 'instruments.iconPiano',
  drum: 'instruments.iconDrum',
  music: 'instruments.iconMusic',
  choir: 'instruments.iconChoir',
  brass: 'instruments.iconBrass',
  wind: 'instruments.iconWind',
  strings: 'instruments.iconStrings',
  synth: 'instruments.iconSynth',
  stage: 'instruments.iconStage',
  sparkles: 'instruments.iconSparkles',
  heart: 'instruments.iconHeart',
  flame: 'instruments.iconFlame',
  lightning: 'instruments.iconLightning',
  crown: 'instruments.iconCrown',
  sun: 'instruments.iconSun',
} as const satisfies Record<InstrumentIcon, string>;

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
