/**
 * Minimal GPX parser — extracts the track points needed to derive distance,
 * D+ and the start coordinates. We don't need GPX-the-full-spec; the file
 * is uploaded by the orga in a controlled flow, and the only consumers are
 * inside this app.
 *
 * Why hand-rolled instead of `@tmcw/togeojson`: togeojson requires a DOM
 * (`DOMParser`), which would pull `@xmldom/xmldom` into the Lambda bundle
 * for a regex pass that fits in 40 lines.
 */

import {
  type LatLng,
  polylineDistanceMeters,
  smoothedElevationGainMeters,
} from '../geo/geo.core';

export interface GpxTrack {
  readonly distanceMeters: number;
  readonly elevationGainMeters: number;
  readonly startLatLng: LatLng;
  readonly points: readonly LatLng[];
}

export class GpxParseError extends Error {
  override readonly name = 'GpxParseError';
}

const TRKPT_TAG_PATTERN = /<trkpt\b[\s\S]*?(?:\/>|<\/trkpt>)/g;
const LAT_ATTR_PATTERN = /\blat\s*=\s*"([^"]+)"/;
const LON_ATTR_PATTERN = /\blon\s*=\s*"([^"]+)"/;
const ELE_PATTERN = /<ele>\s*([-\d.eE+]+)\s*<\/ele>/;

interface RawPoint {
  readonly lat: number;
  readonly lng: number;
  readonly elevation: number | null;
}

/**
 * Parse a string as a finite float. Returns `null` for `undefined`, NaN, and
 * non-finite values. Exported so the `=== undefined` branch can be covered
 * by a direct unit test — at every real call site the input is the capture
 * group of a regex that always populates it, so the branch is otherwise
 * unreachable from production code.
 */
export function tryParseFloat(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractTrackPoints(xml: string): readonly RawPoint[] {
  const collected: RawPoint[] = [];
  // `String.prototype.replace` exposes the full match as a non-optional
  // `string` (no `noUncheckedIndexedAccess` noise), so we use it as a
  // streaming iterator over `<trkpt>` elements. The returned string is
  // discarded — only the side-effect of pushing into `collected` matters.
  xml.replace(TRKPT_TAG_PATTERN, (fullMatch) => {
    const latMatch = LAT_ATTR_PATTERN.exec(fullMatch);
    const lonMatch = LON_ATTR_PATTERN.exec(fullMatch);
    if (latMatch === null || lonMatch === null) return fullMatch;
    const lat = tryParseFloat(latMatch[1]);
    const lng = tryParseFloat(lonMatch[1]);
    if (lat === null || lng === null) return fullMatch;
    const eleMatch = ELE_PATTERN.exec(fullMatch);
    const elevation = eleMatch === null ? null : tryParseFloat(eleMatch[1]);
    collected.push({ lat, lng, elevation });
    return fullMatch;
  });
  return collected;
}

function isWellFormedXml(xml: string): boolean {
  if (xml.length === 0) return false;
  return xml.includes('<gpx') || xml.includes('<trk');
}

/**
 * Parse a GPX file and derive the metadata needed for an edition setup.
 *
 * Throws {@link GpxParseError} when the input is empty, lacks a `<gpx>` or
 * `<trk>` root, or contains no usable `<trkpt>` elements.
 */
export function parseGpx(xml: string): GpxTrack {
  if (!isWellFormedXml(xml)) {
    throw new GpxParseError('GPX input is empty or missing <gpx>/<trk> root.');
  }

  const rawPoints = extractTrackPoints(xml);
  const start = rawPoints[0];
  if (start === undefined) {
    throw new GpxParseError('GPX contains no <trkpt> elements.');
  }

  const points: readonly LatLng[] = rawPoints.map((entry) => ({ lat: entry.lat, lng: entry.lng }));
  const elevations: readonly number[] = rawPoints
    .map((entry) => entry.elevation)
    .filter((value): value is number => value !== null);

  return {
    distanceMeters: polylineDistanceMeters(points),
    elevationGainMeters: smoothedElevationGainMeters(elevations),
    startLatLng: { lat: start.lat, lng: start.lng },
    points,
  };
}
