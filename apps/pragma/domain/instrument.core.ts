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
