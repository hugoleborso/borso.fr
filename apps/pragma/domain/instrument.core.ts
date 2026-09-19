export const INSTRUMENT_FAMILIES = ['harmonic', 'percussive', 'vocal', 'other'] as const;

export type InstrumentFamily = (typeof INSTRUMENT_FAMILIES)[number];

export const DEFAULT_INSTRUMENT_FAMILY: InstrumentFamily = 'other';

// @FollowsBlueprint core-projection
export function familyFromHarmonicFlag(isHarmonic: boolean): InstrumentFamily {
  return isHarmonic ? 'harmonic' : DEFAULT_INSTRUMENT_FAMILY;
}

export function isInstrumentFamily(candidate: string | null): candidate is InstrumentFamily {
  return INSTRUMENT_FAMILIES.some((family) => family === candidate);
}

export function resolveInstrumentFamily(
  storedFamily: string | null,
  isHarmonic: boolean,
): InstrumentFamily {
  if (isInstrumentFamily(storedFamily)) return storedFamily;
  return familyFromHarmonicFlag(isHarmonic);
}

export const INSTRUMENT_ICONS = ['mic-vocal', 'guitar', 'bass', 'piano', 'drum', 'music'] as const;

export type InstrumentIcon = (typeof INSTRUMENT_ICONS)[number];

export const FALLBACK_INSTRUMENT_ICON: InstrumentIcon = 'music';

export const DEFAULT_INSTRUMENT_POSITION = 0;

export function isInstrumentIcon(candidate: string | null): candidate is InstrumentIcon {
  return INSTRUMENT_ICONS.some((icon) => icon === candidate);
}

export function resolveInstrumentIcon(storedIcon: string | null): InstrumentIcon {
  if (isInstrumentIcon(storedIcon)) return storedIcon;
  return FALLBACK_INSTRUMENT_ICON;
}

export function resolveInstrumentPosition(storedPosition: number | null): number {
  return storedPosition ?? DEFAULT_INSTRUMENT_POSITION;
}

const INSTRUMENT_FAMILY_RANK = {
  vocal: 0,
  harmonic: 1,
  percussive: 2,
  other: 3,
} as const satisfies Record<InstrumentFamily, number>;

export function defaultPositionForFamily(family: InstrumentFamily): number {
  return INSTRUMENT_FAMILY_RANK[family];
}

// @FollowsBlueprint core-projection
export function decidePrimaryInstrumentIds(
  instrumentIds: readonly string[],
  requestedPrimaryInstrumentIds: readonly string[] | undefined,
  survivingPrimaryInstrumentIds: readonly string[],
): string[] {
  const claimed = new Set(requestedPrimaryInstrumentIds ?? survivingPrimaryInstrumentIds);
  return instrumentIds.filter((instrumentId) => claimed.has(instrumentId));
}
