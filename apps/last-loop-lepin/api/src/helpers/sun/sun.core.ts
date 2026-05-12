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
const QUARTER_CIRCLE_DEGREES = 90;
const HOURS_IN_DAY = 24;

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

function normalizeDegrees(value: number): number {
  const wrapped = value % FULL_CIRCLE_DEGREES;
  return wrapped < 0 ? wrapped + FULL_CIRCLE_DEGREES : wrapped;
}

function normalizeHours(value: number): number {
  const wrapped = value % HOURS_IN_DAY;
  return wrapped < 0 ? wrapped + HOURS_IN_DAY : wrapped;
}

function computeUtcHour(
  dayOfYear: number,
  latitude: number,
  longitudeHours: number,
  rising: boolean,
): number {
  const approximateTime = rising
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

  const rightAscensionRaw = Math.atan(0.91764 * Math.tan(trueLongitudeRadians)) * RADIANS_TO_DEGREES;
  const rightAscensionDegrees = normalizeDegrees(rightAscensionRaw);
  const trueLongitudeQuadrant =
    Math.floor(trueLongitudeDegrees / QUARTER_CIRCLE_DEGREES) * QUARTER_CIRCLE_DEGREES;
  const rightAscensionQuadrant =
    Math.floor(rightAscensionDegrees / QUARTER_CIRCLE_DEGREES) * QUARTER_CIRCLE_DEGREES;
  const rightAscensionHours =
    (rightAscensionDegrees + (trueLongitudeQuadrant - rightAscensionQuadrant)) *
    HOURS_PER_LONGITUDE_DEGREE;

  const sineOfDeclination = 0.39782 * Math.sin(trueLongitudeRadians);
  const cosineOfDeclination = Math.cos(Math.asin(sineOfDeclination));

  const latitudeRadians = latitude * DEGREES_TO_RADIANS;
  const cosineOfHourAngle =
    (Math.cos(STANDARD_ZENITH_DEGREES * DEGREES_TO_RADIANS) -
      sineOfDeclination * Math.sin(latitudeRadians)) /
    (cosineOfDeclination * Math.cos(latitudeRadians));

  if (cosineOfHourAngle > 1 || cosineOfHourAngle < -1) {
    throw new SunCalculationError(
      cosineOfHourAngle > 1
        ? 'Polar night: sun does not rise at this latitude on this date.'
        : 'Polar day: sun does not set at this latitude on this date.',
    );
  }

  const hourAngleDegrees = rising
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
