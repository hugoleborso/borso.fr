/** @Feature members */

import type { InstrumentFamily, InstrumentIcon } from '@domain/instrument.core';

export interface RosterInstrument {
  readonly id: string;
  readonly name: string;
  readonly family: InstrumentFamily;
  readonly icon: InstrumentIcon;
  readonly position: number;
}

export type CatalogInstrument = RosterInstrument;

// @FollowsBlueprint core-projection
export function predictMemberRoster(
  currentRoster: readonly RosterInstrument[],
  catalog: readonly CatalogInstrument[],
  instrumentIds: readonly string[],
): RosterInstrument[] {
  const known = new Map<string, CatalogInstrument>();
  for (const instrument of currentRoster) known.set(instrument.id, instrument);
  for (const instrument of catalog) known.set(instrument.id, instrument);
  return instrumentIds.flatMap((instrumentId) => {
    const instrument = known.get(instrumentId);
    if (instrument === undefined) return [];
    return [
      {
        id: instrument.id,
        name: instrument.name,
        family: instrument.family,
        icon: instrument.icon,
        position: instrument.position,
      },
    ];
  });
}
