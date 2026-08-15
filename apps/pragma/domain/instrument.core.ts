/**
 * What kind of thing an instrument is, which is the input the transition rule
 * reads and the label the instruments page writes.
 *
 * A harmonic instrument carries chords, so somebody still holding one across
 * two songs can hold the room while the others move. A percussive one keeps
 * time and a vocal one keeps a voice on the front line: both cover a gap, but
 * neither holds harmony, which is why the rule ranks them below.
 *
 * Pure vocabulary — no I/O, no formatting. The label of each family is an i18n
 * key on the site, not a string here.
 */

export const INSTRUMENT_FAMILIES = ['harmonic', 'percussive', 'vocal', 'other'] as const;

export type InstrumentFamily = (typeof INSTRUMENT_FAMILIES)[number];

export const DEFAULT_INSTRUMENT_FAMILY: InstrumentFamily = 'other';

/**
 * The family of a row written before the column existed. Instruments used to
 * carry a single `is_harmonic` boolean, so the only distinction the old data
 * can make is harmonic against everything else; a percussive or vocal
 * instrument reads as `other` until somebody classifies it.
 */
// @FollowsBlueprint core-projection
export function familyFromHarmonicFlag(isHarmonic: boolean): InstrumentFamily {
  return isHarmonic ? 'harmonic' : DEFAULT_INSTRUMENT_FAMILY;
}

export function isInstrumentFamily(candidate: string | null): candidate is InstrumentFamily {
  return INSTRUMENT_FAMILIES.some((family) => family === candidate);
}

/**
 * The family a stored row means, whichever of the two columns is populated.
 * The `family` column is nullable because Aurora DSQL refuses a DEFAULT on a
 * column added after table creation, so rows written before the migration
 * answer through their boolean.
 */
export function resolveInstrumentFamily(
  storedFamily: string | null,
  isHarmonic: boolean,
): InstrumentFamily {
  if (isInstrumentFamily(storedFamily)) return storedFamily;
  return familyFromHarmonicFlag(isHarmonic);
}
