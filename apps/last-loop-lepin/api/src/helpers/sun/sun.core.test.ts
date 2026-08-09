import { describe, expect, it } from 'vitest';
import {
  computeSunriseSunset,
  normalizeDegrees,
  normalizeHours,
  polarCrossingFailure,
  POLAR_DAY_MESSAGE,
  POLAR_NIGHT_MESSAGE,
  SunCalculationError,
} from './sun.core';

const LEPIN = { lat: 45.55, lng: 5.78 };
const REYKJAVIK = { lat: 64.13, lng: -21.94 };
const SYDNEY = { lat: -33.87, lng: 151.21 };
const ARCTIC_NEAR_POLE = { lat: 78.0, lng: 15.0 };
/**
 * The published times for Lépin the two tests below anchor against sit at
 * most 5.899 minutes away from what this port computes (measured: summer
 * sunrise 0.247, summer sunset 4.647, winter sunrise 5.899, winter sunset
 * 5.804). Six is that measured worst case rounded up, not a comfort margin.
 */
const HOUR_TOLERANCE_MINUTES = 6;

function hoursMinutesUtc(date: Date): string {
  const hours = `${date.getUTCHours()}`.padStart(2, '0');
  const minutes = `${date.getUTCMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}

function minutesBetween(left: Date, right: Date): number {
  return Math.abs(left.getTime() - right.getTime()) / 60_000;
}

describe('SunCalculationError', () => {
  it('carries SunCalculationError as its name', () => {
    expect(new SunCalculationError('boom').name).toBe('SunCalculationError');
  });
});

describe('normalizeDegrees', () => {
  it('leaves an angle already inside the turn untouched', () => {
    expect(normalizeDegrees(10)).toBe(10);
    expect(normalizeDegrees(359.5)).toBe(359.5);
  });

  it('maps a whole turn and zero onto zero', () => {
    expect(normalizeDegrees(0)).toBe(0);
    expect(normalizeDegrees(360)).toBe(0);
  });

  it('folds a negative angle forward by one turn', () => {
    expect(normalizeDegrees(-10)).toBe(350);
    expect(normalizeDegrees(-370)).toBe(350);
  });

  it('folds an angle beyond one turn back down', () => {
    expect(normalizeDegrees(730)).toBe(10);
  });
});

describe('normalizeHours', () => {
  it('leaves an hour count already inside the day untouched', () => {
    expect(normalizeHours(10)).toBe(10);
  });

  it('maps a whole day and zero onto zero', () => {
    expect(normalizeHours(0)).toBe(0);
    expect(normalizeHours(24)).toBe(0);
  });

  it('folds a negative hour count forward by one day', () => {
    expect(normalizeHours(-1)).toBe(23);
  });

  it('folds an hour count beyond one day back down', () => {
    expect(normalizeHours(49)).toBe(1);
  });
});

describe('polarCrossingFailure', () => {
  it('reports no failure while the sun crosses the horizon', () => {
    expect(polarCrossingFailure(0)).toBeNull();
    expect(polarCrossingFailure(0.5)).toBeNull();
    expect(polarCrossingFailure(-0.5)).toBeNull();
  });

  it('treats a grazing sun at either bound as a crossing', () => {
    expect(polarCrossingFailure(1)).toBeNull();
    expect(polarCrossingFailure(-1)).toBeNull();
  });

  it('reports polar night above the upper bound', () => {
    expect(polarCrossingFailure(1.0001)).toBe(POLAR_NIGHT_MESSAGE);
    expect(POLAR_NIGHT_MESSAGE).toBe(
      'Polar night: sun does not rise at this latitude on this date.',
    );
  });

  it('reports polar day below the lower bound', () => {
    expect(polarCrossingFailure(-1.0001)).toBe(POLAR_DAY_MESSAGE);
    expect(POLAR_DAY_MESSAGE).toBe('Polar day: sun does not set at this latitude on this date.');
  });
});

/**
 * Golden values, captured from this port. They pin every coefficient of the
 * U.S. Naval Observatory formula to the millisecond: the tolerance-based
 * tests above cannot see a coefficient that moves sunrise by seconds, and
 * several of them do exactly that.
 */
describe('computeSunriseSunset golden values', () => {
  const cases: readonly {
    readonly label: string;
    readonly coordinates: { readonly lat: number; readonly lng: number };
    readonly date: Date;
    readonly sunriseAt: string;
    readonly sunsetAt: string;
  }[] = [
    {
      label: 'Lépin, summer solstice',
      coordinates: LEPIN,
      date: new Date(Date.UTC(2026, 5, 21)),
      sunriseAt: '2026-06-21T03:47:45.196Z',
      sunsetAt: '2026-06-21T19:29:21.209Z',
    },
    {
      label: 'Lépin, winter solstice',
      coordinates: LEPIN,
      date: new Date(Date.UTC(2026, 11, 21)),
      sunriseAt: '2026-12-21T07:13:53.934Z',
      sunsetAt: '2026-12-21T15:55:48.239Z',
    },
    {
      label: 'Lépin, race day near the September equinox',
      coordinates: LEPIN,
      date: new Date(Date.UTC(2026, 8, 19)),
      sunriseAt: '2026-09-19T05:19:31.878Z',
      sunsetAt: '2026-09-19T17:41:11.359Z',
    },
    {
      label: 'Lépin, March equinox',
      coordinates: LEPIN,
      date: new Date(Date.UTC(2026, 2, 20)),
      sunriseAt: '2026-03-20T05:40:58.456Z',
      sunsetAt: '2026-03-20T17:48:52.082Z',
    },
    {
      label: 'Lépin, first day of the year',
      coordinates: LEPIN,
      date: new Date(Date.UTC(2026, 0, 1)),
      sunriseAt: '2026-01-01T07:17:19.705Z',
      sunsetAt: '2026-01-01T16:03:46.705Z',
    },
    {
      label: 'Reykjavík, west of the prime meridian in high summer',
      coordinates: REYKJAVIK,
      date: new Date(Date.UTC(2026, 5, 21)),
      sunriseAt: '2026-06-21T02:55:21.858Z',
      sunsetAt: '2026-06-21T00:03:32.754Z',
    },
    {
      label: 'Sydney, southern hemisphere past the 90th meridian',
      coordinates: SYDNEY,
      date: new Date(Date.UTC(2026, 8, 19)),
      sunriseAt: '2026-09-19T19:49:59.252Z',
      sunsetAt: '2026-09-19T07:48:53.579Z',
    },
  ];

  for (const testCase of cases) {
    it(`reproduces ${testCase.label}`, () => {
      const { sunriseAt, sunsetAt } = computeSunriseSunset(testCase.coordinates, testCase.date);
      expect(sunriseAt.toISOString()).toBe(testCase.sunriseAt);
      expect(sunsetAt.toISOString()).toBe(testCase.sunsetAt);
    });
  }
});

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
