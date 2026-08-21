const EARTH_RADIUS_METERS = 6_371_000;
const DEGREES_IN_HALF_TURN = 180;
const DEGREES_TO_RADIANS = Math.PI / DEGREES_IN_HALF_TURN;

export interface LatLng {
  readonly lat: number;
  readonly lng: number;
}

// @FollowsBlueprint utils-geometry
export function haversineDistanceMeters(origin: LatLng, destination: LatLng): number {
  const originLatRadians = origin.lat * DEGREES_TO_RADIANS;
  const destinationLatRadians = destination.lat * DEGREES_TO_RADIANS;
  const deltaLatRadians = (destination.lat - origin.lat) * DEGREES_TO_RADIANS;
  const deltaLngRadians = (destination.lng - origin.lng) * DEGREES_TO_RADIANS;

  /* eslint-disable no-magic-numbers -- the halved angle, the square and the leading factor are the haversine formula's own notation, hav(t) = sin^2(t / 2) and d = 2R * atan2(sqrt(a), sqrt(1 - a)); naming a 2 puts a hop between the code and the reference. */
  const haversineRoot =
    Math.sin(deltaLatRadians / 2) ** 2 +
    Math.cos(originLatRadians) *
      Math.cos(destinationLatRadians) *
      Math.sin(deltaLngRadians / 2) ** 2;
  const angularDistance = 2 * Math.atan2(Math.sqrt(haversineRoot), Math.sqrt(1 - haversineRoot));
  /* eslint-enable no-magic-numbers */
  return EARTH_RADIUS_METERS * angularDistance;
}
