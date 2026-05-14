import { describe, expect, it } from 'vitest';
import { SunCalculationError, computeSunriseSunset } from './sun.core';

const LEPIN = { lat: 45.55, lng: 5.78 };
const ARCTIC_NEAR_POLE = { lat: 78.0, lng: 15.0 };
const HOUR_TOLERANCE_MINUTES = 10;

function hoursMinutesUtc(date: Date): string {
  const hours = `${date.getUTCHours()}`.padStart(2, '0');
  const minutes = `${date.getUTCMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}

function minutesBetween(left: Date, right: Date): number {
  return Math.abs(left.getTime() - right.getTime()) / 60_000;
}

describe('computeSunriseSunset', () => {
  it('matches known summer solstice times at Lépin', () => {
    const date = new Date(Date.UTC(2026, 5, 21));
    const { sunriseAt, sunsetAt } = computeSunriseSunset(LEPIN, date);

    const expectedSunrise = new Date(Date.UTC(2026, 5, 21, 3, 48));
    const expectedSunset = new Date(Date.UTC(2026, 5, 21, 19, 34));

    expect(minutesBetween(sunriseAt, expectedSunrise)).toBeLessThan(HOUR_TOLERANCE_MINUTES);
    expect(minutesBetween(sunsetAt, expectedSunset)).toBeLessThan(HOUR_TOLERANCE_MINUTES);
  });

  it('matches known winter solstice times at Lépin', () => {
    const date = new Date(Date.UTC(2026, 11, 21));
    const { sunriseAt, sunsetAt } = computeSunriseSunset(LEPIN, date);

    const expectedSunrise = new Date(Date.UTC(2026, 11, 21, 7, 8));
    const expectedSunset = new Date(Date.UTC(2026, 11, 21, 15, 50));

    expect(minutesBetween(sunriseAt, expectedSunrise)).toBeLessThan(HOUR_TOLERANCE_MINUTES);
    expect(minutesBetween(sunsetAt, expectedSunset)).toBeLessThan(HOUR_TOLERANCE_MINUTES);
  });

  it('returns sunrise before sunset on race-day in September', () => {
    const raceDay = new Date(Date.UTC(2026, 8, 19));
    const { sunriseAt, sunsetAt } = computeSunriseSunset(LEPIN, raceDay);
    expect(sunriseAt.getTime()).toBeLessThan(sunsetAt.getTime());
  });

  it('puts both events inside the date day (UTC)', () => {
    const date = new Date(Date.UTC(2026, 8, 19, 12, 0));
    const { sunriseAt, sunsetAt } = computeSunriseSunset(LEPIN, date);
    expect(hoursMinutesUtc(sunriseAt) > '03:00').toBe(true);
    expect(hoursMinutesUtc(sunsetAt) < '20:00').toBe(true);
  });

  it('handles longitudes on the negative side of the prime meridian', () => {
    const reykjavik = { lat: 64.13, lng: -21.94 };
    const date = new Date(Date.UTC(2026, 5, 21));
    const { sunriseAt, sunsetAt } = computeSunriseSunset(reykjavik, date);
    expect(sunriseAt.getUTCDate()).toBe(21);
    expect(sunsetAt.getUTCDate()).toBe(21);
  });

  it('throws SunCalculationError at polar latitudes near summer solstice (polar day)', () => {
    const date = new Date(Date.UTC(2026, 5, 21));
    expect(() => computeSunriseSunset(ARCTIC_NEAR_POLE, date)).toThrow(SunCalculationError);
  });

  it('throws SunCalculationError at polar latitudes near winter solstice (polar night)', () => {
    const date = new Date(Date.UTC(2026, 11, 21));
    expect(() => computeSunriseSunset(ARCTIC_NEAR_POLE, date)).toThrow(SunCalculationError);
  });

  it('ignores the time portion of the input date', () => {
    const morning = new Date(Date.UTC(2026, 8, 19, 4, 0));
    const evening = new Date(Date.UTC(2026, 8, 19, 23, 0));
    expect(computeSunriseSunset(LEPIN, morning)).toEqual(computeSunriseSunset(LEPIN, evening));
  });
});
