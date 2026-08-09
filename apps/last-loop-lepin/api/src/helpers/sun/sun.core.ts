/**
 * Sunrise / sunset calculation — pure, no I/O, no `new Date()`.
 *
 * Port of the U.S. Naval Observatory's compact algorithm (zenith 90.833°,
 * which is the standard civil definition that already folds in the solar
 * disc radius and standard atmospheric refraction). Accurate to within a
 * minute or two for mid-latitudes, well below the granularity the orga
 * cares about (the values are displayed as wall-clock markers on the
 * loops timeline).
 *
 * Polar day / polar night both surface as a `SunCalculationError`.
 */

import type { LatLng } from '../geo/geo.core';

const DEGREES_TO_RADIANS = Math.PI / 180;
const RADIANS_TO_DEGREES = 180 / Math.PI;
const HOURS_PER_LONGITUDE_DEGREE = 1 / 15;
const STANDARD_ZENITH_DEGREES = 90.833;
const MILLISECONDS_PER_HOUR = 3_600_000;
const FULL_CIRCLE_DEGREES = 360;
const HOURS_IN_DAY = 24;

export const POLAR_NIGHT_MESSAGE = 'Polar night: sun does not rise at this latitude on this date.';
export const POLAR_DAY_MESSAGE = 'Polar day: sun does not set at this latitude on this date.';

export class SunCalculationError extends Error {
  override readonly name = 'SunCalculationError';
}

export interface SunTimes {
  readonly sunriseAt: Date;
  readonly sunsetAt: Date;
}

function dayOfYearUtc(date: Date): number {
  const millisecondsPerDay = 86_400_000;
  const normalizedTimestamp = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  const yearStartTimestamp = Date.UTC(date.getUTCFullYear(), 0, 0);
  return Math.floor((normalizedTimestamp - yearStartTimestamp) / millisecondsPerDay);
}

/**
 * Fold an angle into `[0, 360)`. Exported for direct testing: every caller
 * inside this module feeds the result into quadrant arithmetic that is
 * invariant under whole turns, so the wrap is only observable at the unit
 * boundary.
 */
export function normalizeDegrees(value: number): number {
  const wrapped = value % FULL_CIRCLE_DEGREES;
  return wrapped < 0 ? wrapped + FULL_CIRCLE_DEGREES : wrapped;
}

/** Fold an hour count into `[0, 24)`. Exported for the same reason. */
export function normalizeHours(value: number): number {
  const wrapped = value % HOURS_IN_DAY;
  return wrapped < 0 ? wrapped + HOURS_IN_DAY : wrapped;
}

/**
 * The reason the sun never crosses the horizon on this day, or `null` when
 * it does. `cosineOfHourAngle` leaves `[-1, 1]` exactly when the sun stays
 * below the horizon all day (above `1`) or above it all day (below `-1`).
 */
export function polarCrossingFailure(cosineOfHourAngle: number): string | null {
  if (cosineOfHourAngle > 1) return POLAR_NIGHT_MESSAGE;
  if (cosineOfHourAngle < -1) return POLAR_DAY_MESSAGE;
  return null;
}

function computeUtcHour(
  dayOfYear: number,
  latitude: number,
  longitudeHours: number,
  isRising: boolean,
): number {
  const approximateTime = isRising
    ? dayOfYear + (6 - longitudeHours) / HOURS_IN_DAY
    : dayOfYear + (18 - longitudeHours) / HOURS_IN_DAY;

  const meanAnomalyDegrees = 0.9856 * approximateTime - 3.289;
  const meanAnomalyRadians = meanAnomalyDegrees * DEGREES_TO_RADIANS;

  const trueLongitudeDegrees = normalizeDegrees(
    meanAnomalyDegrees +
      1.916 * Math.sin(meanAnomalyRadians) +
      0.02 * Math.sin(2 * meanAnomalyRadians) +
      282.634,
  );
  const trueLongitudeRadians = trueLongitudeDegrees * DEGREES_TO_RADIANS;

  // `atan2` lands the right ascension in the same quadrant as the true
  // longitude on its own. The reference algorithm reaches the same angle by
  // taking `atan` of a tangent and adding back the quadrant difference,
  // which blows up numerically as the longitude approaches 90°.
  const rightAscensionDegrees = normalizeDegrees(
    Math.atan2(0.91764 * Math.sin(trueLongitudeRadians), Math.cos(trueLongitudeRadians)) *
      RADIANS_TO_DEGREES,
  );
  const rightAscensionHours = rightAscensionDegrees * HOURS_PER_LONGITUDE_DEGREE;

  const sineOfDeclination = 0.39782 * Math.sin(trueLongitudeRadians);
  const cosineOfDeclination = Math.cos(Math.asin(sineOfDeclination));

  const latitudeRadians = latitude * DEGREES_TO_RADIANS;
  const cosineOfHourAngle =
    (Math.cos(STANDARD_ZENITH_DEGREES * DEGREES_TO_RADIANS) -
      sineOfDeclination * Math.sin(latitudeRadians)) /
    (cosineOfDeclination * Math.cos(latitudeRadians));

  const polarFailure = polarCrossingFailure(cosineOfHourAngle);
  if (polarFailure !== null) {
    throw new SunCalculationError(polarFailure);
  }

  const hourAngleDegrees = isRising
    ? FULL_CIRCLE_DEGREES - Math.acos(cosineOfHourAngle) * RADIANS_TO_DEGREES
    : Math.acos(cosineOfHourAngle) * RADIANS_TO_DEGREES;
  const hourAngleHours = hourAngleDegrees * HOURS_PER_LONGITUDE_DEGREE;

  const localMeanTime = hourAngleHours + rightAscensionHours - 0.06571 * approximateTime - 6.622;
  return normalizeHours(localMeanTime - longitudeHours);
}

/**
 * Compute sunrise and sunset for a `LatLng` at the UTC date of the provided
 * `date`. The time portion of `date` is ignored — only its UTC calendar day
 * is used.
 *
 * Throws {@link SunCalculationError} when the sun does not rise or does not
 * set at the location on the given day (polar latitudes near the solstices).
 */
export function computeSunriseSunset(coordinates: LatLng, date: Date): SunTimes {
  const dayOfYear = dayOfYearUtc(date);
  const longitudeHours = coordinates.lng * HOURS_PER_LONGITUDE_DEGREE;

  const sunriseUtcHours = computeUtcHour(dayOfYear, coordinates.lat, longitudeHours, true);
  const sunsetUtcHours = computeUtcHour(dayOfYear, coordinates.lat, longitudeHours, false);

  const dayStartUtcMs = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

  return {
    sunriseAt: new Date(dayStartUtcMs + sunriseUtcHours * MILLISECONDS_PER_HOUR),
    sunsetAt: new Date(dayStartUtcMs + sunsetUtcHours * MILLISECONDS_PER_HOUR),
  };
}
