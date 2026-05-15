/**
 * Great-circle distance helper — pure, deterministic.
 *
 * Twin module: an identical copy lives at
 * `site/src/domain/haversine.utils.ts`. The duplication is assumed (cf.
 * `docs/features/last-loop-lepin/self-punch-runners/spec/spec.md` Q8bis):
 * the formula is mathematically frozen (depends only on
 * `EARTH_RADIUS_METERS`) and the two files share the exact same test
 * vectors, so a drift in one side breaks the back-e2e self-punch test
 * end-to-end. The only allowed divergence between the two files is the
 * `import` line — there is none here either; both files are byte-identical.
 */

const EARTH_RADIUS_METERS = 6_371_000;
const DEGREES_TO_RADIANS = Math.PI / 180;

export interface LatLng {
  readonly lat: number;
  readonly lng: number;
}

/**
 * Great-circle distance between two `LatLng` points, in metres.
 * Returns 0 for coincident points; symmetric in its arguments.
 */
export function haversineDistanceMeters(from: LatLng, to: LatLng): number {
  const fromLatRadians = from.lat * DEGREES_TO_RADIANS;
  const toLatRadians = to.lat * DEGREES_TO_RADIANS;
  const deltaLatRadians = (to.lat - from.lat) * DEGREES_TO_RADIANS;
  const deltaLngRadians = (to.lng - from.lng) * DEGREES_TO_RADIANS;

  const haversineRoot =
    Math.sin(deltaLatRadians / 2) ** 2 +
    Math.cos(fromLatRadians) * Math.cos(toLatRadians) * Math.sin(deltaLngRadians / 2) ** 2;
  const angularDistance = 2 * Math.atan2(Math.sqrt(haversineRoot), Math.sqrt(1 - haversineRoot));
  return EARTH_RADIUS_METERS * angularDistance;
}
