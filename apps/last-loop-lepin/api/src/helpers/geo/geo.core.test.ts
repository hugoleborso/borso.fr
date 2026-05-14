import { describe, expect, it } from 'vitest';
import { haversineMeters, polylineDistanceMeters, smoothedElevationGainMeters } from './geo.core';

describe('haversineMeters', () => {
  it('returns 0 between coincident points', () => {
    const point = { lat: 45.5, lng: 5.8 };
    expect(haversineMeters(point, point)).toBe(0);
  });

  it('matches a known distance Paris → Lyon within 0.5%', () => {
    const paris = { lat: 48.8566, lng: 2.3522 };
    const lyon = { lat: 45.764, lng: 4.8357 };
    const expectedMeters = 392_000;
    const actual = haversineMeters(paris, lyon);
    expect(actual).toBeGreaterThan(expectedMeters * 0.995);
    expect(actual).toBeLessThan(expectedMeters * 1.005);
  });

  it('antipodes ≈ π × R', () => {
    const north = { lat: 0, lng: 0 };
    const south = { lat: 0, lng: 180 };
    const expectedHalfCircumferenceMeters = Math.PI * 6_371_000;
    expect(haversineMeters(north, south)).toBeCloseTo(expectedHalfCircumferenceMeters, -2);
  });

  it('is symmetric', () => {
    const lepin = { lat: 45.55, lng: 5.78 };
    const summit = { lat: 45.57, lng: 5.79 };
    expect(haversineMeters(lepin, summit)).toBeCloseTo(haversineMeters(summit, lepin), 6);
  });
});

describe('polylineDistanceMeters', () => {
  it('returns 0 for an empty polyline', () => {
    expect(polylineDistanceMeters([])).toBe(0);
  });

  it('returns 0 for a single point', () => {
    expect(polylineDistanceMeters([{ lat: 0, lng: 0 }])).toBe(0);
  });

  it('sums consecutive segments', () => {
    const polyline = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
      { lat: 0, lng: 2 },
    ];
    const expectedSegmentMeters = haversineMeters(
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
    );
    expect(polylineDistanceMeters(polyline)).toBeCloseTo(expectedSegmentMeters * 2, 1);
  });
});

describe('smoothedElevationGainMeters', () => {
  it('returns 0 on an empty array', () => {
    expect(smoothedElevationGainMeters([])).toBe(0);
  });

  it('returns 0 on a single elevation', () => {
    expect(smoothedElevationGainMeters([500])).toBe(0);
  });

  it('accumulates a clean climb above the noise floor', () => {
    expect(smoothedElevationGainMeters([500, 510, 520, 530])).toBe(30);
  });

  it('ignores noise below the threshold (default 3 m)', () => {
    expect(smoothedElevationGainMeters([500, 501, 502, 500.5, 501])).toBe(0);
  });

  it('does not credit descents', () => {
    expect(smoothedElevationGainMeters([500, 480, 460])).toBe(0);
  });

  it('credits a climb after a descent', () => {
    expect(smoothedElevationGainMeters([500, 480, 530])).toBe(50);
  });

  it('honours an explicit noise floor', () => {
    const customFloor = 10;
    expect(smoothedElevationGainMeters([500, 505, 510], customFloor)).toBe(0);
    expect(smoothedElevationGainMeters([500, 511, 522], customFloor)).toBe(22);
  });
});
