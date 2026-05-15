import { describe, expect, it } from 'vitest';
import { haversineDistanceMeters } from './haversine.utils';

const PARIS = { lat: 48.8566, lng: 2.3522 };
const LYON = { lat: 45.7640, lng: 4.8357 };
const PARIS_LYON_REFERENCE_METERS = 392_000;
const PARIS_LYON_TOLERANCE_RATIO = 0.005;

const ANTIPODE_OF_PARIS = { lat: -48.8566, lng: 2.3522 + 180 };
const EARTH_HALF_CIRCUMFERENCE_METERS = 20_015_086;
const ANTIPODE_TOLERANCE_METERS = 50_000;

describe('haversineDistanceMeters', () => {
  it('returns 0 for coincident points', () => {
    expect(haversineDistanceMeters(PARIS, PARIS)).toBe(0);
  });

  it('is symmetric in its arguments', () => {
    const forward = haversineDistanceMeters(PARIS, LYON);
    const backward = haversineDistanceMeters(LYON, PARIS);
    expect(forward).toBeCloseTo(backward, 6);
  });

  it('matches the Paris ↔ Lyon great-circle distance within 0.5 %', () => {
    const distance = haversineDistanceMeters(PARIS, LYON);
    const drift = Math.abs(distance - PARIS_LYON_REFERENCE_METERS);
    expect(drift / PARIS_LYON_REFERENCE_METERS).toBeLessThan(PARIS_LYON_TOLERANCE_RATIO);
  });

  it('approximates half the Earth circumference for antipodal points', () => {
    const distance = haversineDistanceMeters(PARIS, ANTIPODE_OF_PARIS);
    expect(Math.abs(distance - EARTH_HALF_CIRCUMFERENCE_METERS)).toBeLessThan(
      ANTIPODE_TOLERANCE_METERS,
    );
  });

  it('keeps points ≤100 m apart inside the 100 m geofence (frontier vector)', () => {
    // ~0.0008 degrees of latitude at this latitude ≈ 89 m.
    const nearby = { lat: PARIS.lat + 0.0008, lng: PARIS.lng };
    const distance = haversineDistanceMeters(PARIS, nearby);
    expect(distance).toBeLessThan(100);
    expect(distance).toBeGreaterThan(50);
  });

  it('flips lng sign without affecting magnitude (east vs west symmetry)', () => {
    const east = { lat: 0, lng: 10 };
    const west = { lat: 0, lng: -10 };
    const origin = { lat: 0, lng: 0 };
    expect(haversineDistanceMeters(origin, east)).toBeCloseTo(
      haversineDistanceMeters(origin, west),
      6,
    );
  });

  it('flips lat sign without affecting magnitude (north vs south symmetry)', () => {
    const north = { lat: 10, lng: 0 };
    const south = { lat: -10, lng: 0 };
    const origin = { lat: 0, lng: 0 };
    expect(haversineDistanceMeters(origin, north)).toBeCloseTo(
      haversineDistanceMeters(origin, south),
      6,
    );
  });
});
