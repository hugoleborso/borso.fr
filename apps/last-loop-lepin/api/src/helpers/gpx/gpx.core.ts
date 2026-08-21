import { type LatLng, polylineDistanceMeters, smoothedElevationGainMeters } from '../geo/geo.core';

export interface GpxTrack {
  readonly distanceMeters: number;
  readonly elevationGainMeters: number;
  readonly startLatLng: LatLng;
  readonly points: readonly LatLng[];
  readonly pointTimeFractions: readonly number[] | null;
  readonly pointElevations: readonly number[] | null;
}

// @FollowsBlueprint named-domain-error
export class GpxParseError extends Error {
  override readonly name = 'GpxParseError';
}

const TRKPT_TAG_PATTERN = /<trkpt\b[\s\S]*?(?:\/>|<\/trkpt>)/g;
const LATITUDE_ATTRIBUTE_PATTERN = /(?<=\blat\s*=\s*")[^"]+/;
const LONGITUDE_ATTRIBUTE_PATTERN = /(?<=\blon\s*=\s*")[^"]+/;
const ELE_PATTERN = /(?<=<ele>\s*)[-\d.eE+]+(?=\s*<\/ele>)/;
const TIME_PATTERN = /(?<=<time>\s*)[^<\s][^<]*?(?=\s*<\/time>)/;

const EMPTY_SERIES_TIMESTAMP_MS = 0;

interface RawPoint {
  readonly lat: number;
  readonly lng: number;
  readonly elevation: number | null;
  readonly timestampMs: number | null;
}

export function tryParseFloat(raw: string): number | null {
  const asNumber = Number.parseFloat(raw);
  return Number.isFinite(asNumber) ? asNumber : null;
}

export function tryParseDate(raw: string): number | null {
  const parsedMs = Date.parse(raw);
  return Number.isFinite(parsedMs) ? parsedMs : null;
}

function extractTrackPoints(xml: string): readonly RawPoint[] {
  const collected: RawPoint[] = [];
  xml.replace(TRKPT_TAG_PATTERN, (fullMatch) => {
    const latMatch = LATITUDE_ATTRIBUTE_PATTERN.exec(fullMatch);
    const lonMatch = LONGITUDE_ATTRIBUTE_PATTERN.exec(fullMatch);
    if (latMatch === null || lonMatch === null) return fullMatch;
    const lat = tryParseFloat(latMatch[0]);
    const lng = tryParseFloat(lonMatch[0]);
    if (lat === null || lng === null) return fullMatch;
    const eleMatch = ELE_PATTERN.exec(fullMatch);
    const elevation = eleMatch === null ? null : tryParseFloat(eleMatch[0]);
    const timeMatch = TIME_PATTERN.exec(fullMatch);
    const timestampMs = timeMatch === null ? null : tryParseDate(timeMatch[0]);
    collected.push({ lat, lng, elevation, timestampMs });
    return fullMatch;
  });
  return collected;
}

function isWellFormedXml(xml: string): boolean {
  return xml.includes('<gpx') || xml.includes('<trk');
}

export function buildPointTimeFractions(
  timestampsMs: readonly (number | null)[],
): readonly number[] | null {
  const timedPoints: number[] = [];
  for (const timestampMs of timestampsMs) {
    if (timestampMs === null) return null;
    timedPoints.push(timestampMs);
  }
  const first = timedPoints[0] ?? EMPTY_SERIES_TIMESTAMP_MS;
  const last = timedPoints[timedPoints.length - 1] ?? EMPTY_SERIES_TIMESTAMP_MS;
  const span = last - first;
  if (span <= 0) return null;
  return timedPoints.map((timestampMs) => (timestampMs - first) / span);
}

export function buildPointElevations(
  elevations: readonly (number | null)[],
): readonly number[] | null {
  const collected: number[] = [];
  for (const elevation of elevations) {
    if (elevation === null) return null;
    collected.push(elevation);
  }
  return collected;
}

/**
 * @Blueprint core-parser-named-error
 * @BlueprintName Core Parser With A Named Error
 * @BlueprintUsage Use for a hand written parser, so the caller catches a type of the parser's own rather than a bare `Error` it has to match on the message.
 * @BlueprintDescription Parses the file with regular expressions whose delimiters sit in lookarounds so each match types as a plain string, and throws the module's own `GpxParseError` for the two inputs it cannot use, which the controller answers as a 400 by catching the class.
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
  const rawElevations: readonly (number | null)[] = rawPoints.map((entry) => entry.elevation);
  const elevationsForDPlus: readonly number[] = rawElevations.filter(
    (value): value is number => value !== null,
  );
  const pointElevations = buildPointElevations(rawElevations);
  const timestampsMs: readonly (number | null)[] = rawPoints.map((entry) => entry.timestampMs);
  const pointTimeFractions = buildPointTimeFractions(timestampsMs);

  return {
    distanceMeters: polylineDistanceMeters(points),
    elevationGainMeters: smoothedElevationGainMeters(elevationsForDPlus),
    startLatLng: { lat: start.lat, lng: start.lng },
    points,
    pointTimeFractions,
    pointElevations,
  };
}
