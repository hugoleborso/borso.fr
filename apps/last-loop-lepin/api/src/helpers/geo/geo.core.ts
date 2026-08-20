import { haversineDistanceMeters, type LatLng } from './haversine.utils';

const ELEVATION_NOISE_THRESHOLD_METERS = 3;

export type { LatLng };

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
