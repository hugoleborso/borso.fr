import { describe, expect, it } from 'vitest';
import { polylineDistanceMeters, smoothedElevationGainMeters } from './geo.core';
import { haversineDistanceMeters } from './haversine.utils';

// @FollowsBlueprint test-pure-unit
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
    const expectedSegmentMeters = haversineDistanceMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
    expect(polylineDistanceMeters(polyline)).toBeCloseTo(expectedSegmentMeters * 2, 1);
  });
});

// @FollowsBlueprint test-pure-unit
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

  it('keeps the anchor on noise, so a slow drift still totals a climb', () => {
    expect(smoothedElevationGainMeters([500, 502, 504, 506])).toBe(4);
  });

  it('needs a descent strictly past the floor to move the anchor', () => {
    expect(smoothedElevationGainMeters([500, 497, 502])).toBe(0);
  });

  it('honours an explicit noise floor', () => {
    const customFloor = 10;
    expect(smoothedElevationGainMeters([500, 505, 510], customFloor)).toBe(0);
    expect(smoothedElevationGainMeters([500, 511, 522], customFloor)).toBe(22);
  });
});
