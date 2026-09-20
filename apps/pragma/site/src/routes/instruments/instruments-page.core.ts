/** @Feature instruments */

import type { InstrumentFamily, InstrumentIcon } from '@domain/instrument.core';

export const INSTRUMENT_ICON_LABEL_KEY = {
  'mic-vocal': 'instruments.iconMicVocal',
  guitar: 'instruments.iconGuitar',
  bass: 'instruments.iconBass',
  piano: 'instruments.iconPiano',
  drum: 'instruments.iconDrum',
  music: 'instruments.iconMusic',
} as const satisfies Record<InstrumentIcon, string>;

export const INSTRUMENT_FAMILY_LABEL_KEY = {
  harmonic: 'instruments.familyHarmonic',
  percussive: 'instruments.familyPercussive',
  vocal: 'instruments.familyVocal',
  other: 'instruments.familyOther',
} as const satisfies Record<InstrumentFamily, string>;

export interface PlayedInstrument {
  readonly id: string;
  readonly players: readonly { readonly memberId: string; readonly isPrimary: boolean }[];
}

export interface MemberInstrumentClaim {
  readonly instrumentIds: string[];
  readonly primaryInstrumentIds: string[];
}

export function claimOfMember(
  instruments: readonly PlayedInstrument[],
  memberId: string,
): MemberInstrumentClaim {
  const instrumentIds: string[] = [];
  const primaryInstrumentIds: string[] = [];
  for (const instrument of instruments) {
    const link = instrument.players.find((player) => player.memberId === memberId);
    if (link === undefined) continue;
    instrumentIds.push(instrument.id);
    if (link.isPrimary) primaryInstrumentIds.push(instrument.id);
  }
  return { instrumentIds, primaryInstrumentIds };
}

export function togglePrimacy(
  primaryInstrumentIds: readonly string[],
  instrumentId: string,
): string[] {
  if (primaryInstrumentIds.includes(instrumentId)) {
    return primaryInstrumentIds.filter((candidate) => candidate !== instrumentId);
  }
  return [...primaryInstrumentIds, instrumentId];
}

export type InstrumentDeletionEffect = 'keep-form' | 'clear-form';

// @FollowsBlueprint core-view-intent
export function selectInstrumentDeletionEffect(
  selectedInstrumentId: string | null,
  deletedInstrumentId: string,
): InstrumentDeletionEffect {
  return selectedInstrumentId === deletedInstrumentId ? 'clear-form' : 'keep-form';
}
