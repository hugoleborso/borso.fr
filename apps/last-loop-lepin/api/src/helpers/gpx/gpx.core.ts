/**
 * Minimal GPX parser — extracts the track points needed to derive distance,
 * D+ and the start coordinates. We don't need GPX-the-full-spec; the file
 * is uploaded by the orga in a controlled flow, and the only consumers are
 * inside this app.
 *
 * Why hand-rolled instead of `@tmcw/togeojson`: togeojson requires a DOM
 * (`DOMParser`), which adds `@xmldom/xmldom` to the Lambda bundle. We only
 * need `<trkpt lat=".." lon=".."><ele>..</ele></trkpt>` plus the points'
 * ordering — a regex pass is correct and 40 lines.
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

const TRKPT_PATTERN = /<trkpt\b[^>]*\blat\s*=\s*"([^"]+)"[^>]*\blon\s*=\s*"([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/g;
const SHORT_TRKPT_PATTERN = /<trkpt\b[^>]*\blat\s*=\s*"([^"]+)"[^>]*\blon\s*=\s*"([^"]+)"[^>]*\/>/g;
const ELE_PATTERN = /<ele>\s*([-\d.eE+]+)\s*<\/ele>/;

interface RawPoint {
  readonly lat: number;
  readonly lng: number;
  readonly elevation: number | null;
}

function tryParseFloat(raw: string): number | null {
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractTrackPoints(xml: string): readonly RawPoint[] {
  const collected: RawPoint[] = [];

  // Regex captures are guaranteed non-undefined when the pattern matches:
  // the `lat=` and `lon=` groups require `[^"]+`, and the `<trkpt>...</trkpt>`
  // body group always exists. The `!` assertions encode that invariant — without
  // them noUncheckedIndexedAccess forces defensive branches that no input can reach.
  for (const match of xml.matchAll(TRKPT_PATTERN)) {
    const lat = tryParseFloat(match[1]!);
    const lng = tryParseFloat(match[2]!);
    if (lat === null || lng === null) continue;
    const eleMatch = match[3]!.match(ELE_PATTERN);
    const elevation = eleMatch === null ? null : tryParseFloat(eleMatch[1]!);
    collected.push({ lat, lng, elevation });
  }

  for (const match of xml.matchAll(SHORT_TRKPT_PATTERN)) {
    const lat = tryParseFloat(match[1]!);
    const lng = tryParseFloat(match[2]!);
    if (lat === null || lng === null) continue;
    collected.push({ lat, lng, elevation: null });
  }

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
