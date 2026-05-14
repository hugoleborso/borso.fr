/**
 * Earth-surface geometry helpers — pure, no I/O.
 *
 * Distances use the spherical-earth approximation (Haversine). For a 6 km
 * loop that's accurate to a few metres, well below GPX measurement noise.
 */

const EARTH_RADIUS_METERS = 6_371_000;
const DEGREES_TO_RADIANS = Math.PI / 180;
const ELEVATION_NOISE_THRESHOLD_METERS = 3;

export interface LatLng {
  readonly lat: number;
  readonly lng: number;
}

/**
 * Great-circle distance between two `LatLng` points, in metres.
 * Returns 0 for coincident points; symmetric in its arguments.
 */
export function haversineMeters(from: LatLng, to: LatLng): number {
  const phi1 = from.lat * DEGREES_TO_RADIANS;
  const phi2 = to.lat * DEGREES_TO_RADIANS;
  const deltaPhi = (to.lat - from.lat) * DEGREES_TO_RADIANS;
  const deltaLambda = (to.lng - from.lng) * DEGREES_TO_RADIANS;

  const haversineRoot =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const angularDistance = 2 * Math.atan2(Math.sqrt(haversineRoot), Math.sqrt(1 - haversineRoot));
  return EARTH_RADIUS_METERS * angularDistance;
}

/**
 * Total horizontal length of a polyline (sum of Haversine distances between
 * consecutive points). Returns 0 for fewer than two points.
 */
export function polylineDistanceMeters(points: readonly LatLng[]): number {
  let total = 0;
  let previous: LatLng | undefined;
  for (const current of points) {
    if (previous !== undefined) {
      total += haversineMeters(previous, current);
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
