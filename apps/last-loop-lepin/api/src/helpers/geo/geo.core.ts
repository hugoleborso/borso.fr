/**
 * Earth-surface geometry helpers — pure, no I/O.
 *
 * Distances use the spherical-earth approximation (Haversine). For a 6 km
 * loop that's accurate to a few metres, well below GPX measurement noise.
 */

import { haversineDistanceMeters, type LatLng } from './haversine.utils';

const ELEVATION_NOISE_THRESHOLD_METERS = 3;

export type { LatLng };

/**
 * Total horizontal length of a polyline (sum of Haversine distances between
 * consecutive points). Returns 0 for fewer than two points.
 */
export function polylineDistanceMeters(points: readonly LatLng[]): number {
  let total = 0;
  let previous: LatLng | undefined;
  for (const current of points) {
    if (previous !== undefined) {
      total += haversineDistanceMeters(previous, current);
    }
    previous = current;
  }
  return total;
}

/**
 * Cumulative *positive* elevation change along a series of elevations, with
 * a noise floor below which gains are ignored. Descents do not contribute
 * (we measure D+, not net). `noiseFloorMeters` defaults to 3 m — typical
 * for consumer GPS noise per fix on hilly terrain.
 */
// @FollowsBlueprint helper-module
export function smoothedElevationGainMeters(
  elevations: readonly number[],
  noiseFloorMeters: number = ELEVATION_NOISE_THRESHOLD_METERS,
): number {
  let accumulator = 0;
  let lastConfirmed: number | undefined;
  for (const current of elevations) {
    if (lastConfirmed === undefined) {
      lastConfirmed = current;
      continue;
    }
    const delta = current - lastConfirmed;
    if (delta > noiseFloorMeters) {
      accumulator += delta;
      lastConfirmed = current;
    } else if (delta < -noiseFloorMeters) {
      lastConfirmed = current;
    }
  }
  return accumulator;
}
