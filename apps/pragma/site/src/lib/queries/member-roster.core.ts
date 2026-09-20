/** @Feature members */

import {
  decidePrimaryInstrumentIds,
  type InstrumentFamily,
  type InstrumentIcon,
} from '@domain/instrument.core';

export interface RosterInstrument {
  readonly id: string;
  readonly name: string;
  readonly family: InstrumentFamily;
  readonly icon: InstrumentIcon;
  readonly position: number;
  readonly isPrimary: boolean;
}

export interface CatalogInstrument {
  readonly id: string;
  readonly name: string;
  readonly family: InstrumentFamily;
  readonly icon: InstrumentIcon;
  readonly position: number;
}

// @FollowsBlueprint core-projection
export function predictMemberRoster(
  currentRoster: readonly RosterInstrument[],
  catalog: readonly CatalogInstrument[],
  instrumentIds: readonly string[],
  requestedPrimaryInstrumentIds: readonly string[] | undefined,
): RosterInstrument[] {
  const known = new Map<string, CatalogInstrument>();
  for (const instrument of currentRoster) known.set(instrument.id, instrument);
  for (const instrument of catalog) known.set(instrument.id, instrument);
  const survivingPrimaryInstrumentIds = currentRoster
    .filter((instrument) => instrument.isPrimary)
    .map((instrument) => instrument.id);
  const primaryInstrumentIds = new Set(
    decidePrimaryInstrumentIds(
      instrumentIds,
      requestedPrimaryInstrumentIds,
      survivingPrimaryInstrumentIds,
    ),
  );
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
        isPrimary: primaryInstrumentIds.has(instrumentId),
      },
    ];
  });
}
