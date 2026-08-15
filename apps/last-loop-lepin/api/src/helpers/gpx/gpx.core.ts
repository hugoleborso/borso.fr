/**
 * Minimal GPX parser — extracts the track points needed to derive distance,
 * D+, the start coordinates and the per-point recorded timestamp. We don't
 * need GPX-the-full-spec; the file is uploaded by the orga in a controlled
 * flow, and the only consumers are inside this app.
 *
 * Why hand-rolled instead of `@tmcw/togeojson`: togeojson requires a DOM
 * (`DOMParser`), which would pull `@xmldom/xmldom` into the Lambda bundle
 * for a regex pass that fits in 40 lines.
 */

import { type LatLng, polylineDistanceMeters, smoothedElevationGainMeters } from '../geo/geo.core';

export interface GpxTrack {
  readonly distanceMeters: number;
  readonly elevationGainMeters: number;
  readonly startLatLng: LatLng;
  readonly points: readonly LatLng[];
  /**
   * Cumulative normalised time fractions, one per point, monotonically
   * increasing from `0` to `1`. `null` when at least one `<trkpt>` lacks a
   * parseable `<time>` — the timing-completeness-invalidates-series
   * convention. The DTO boundary converts `null` → omitted JSON key.
   */
  readonly pointTimeFractions: readonly number[] | null;
  /**
   * Per-point elevation in meters, parallel to {@link points}. `null` when
   * at least one `<trkpt>` lacks a parseable `<ele>` — same all-or-nothing
   * convention as {@link pointTimeFractions}. The DTO boundary converts
   * `null` → omitted JSON key.
   */
  readonly pointElevations: readonly number[] | null;
}

// @FollowsBlueprint named-domain-error
export class GpxParseError extends Error {
  override readonly name = 'GpxParseError';
}

const TRKPT_TAG_PATTERN = /<trkpt\b[\s\S]*?(?:\/>|<\/trkpt>)/g;
// The delimiters sit in lookarounds so the value is the whole match, which
// TypeScript types as a plain `string` — a capture group would be
// `string | undefined` and buy an unreachable branch at every call site.
const LATITUDE_ATTRIBUTE_PATTERN = /(?<=\blat\s*=\s*")[^"]+/;
const LONGITUDE_ATTRIBUTE_PATTERN = /(?<=\blon\s*=\s*")[^"]+/;
const ELE_PATTERN = /(?<=<ele>\s*)[-\d.eE+]+(?=\s*<\/ele>)/;
const TIME_PATTERN = /(?<=<time>\s*)[^<\s][^<]*?(?=\s*<\/time>)/;

/** Stand-in for both ends of an empty series, so its span comes out zero. */
const EMPTY_SERIES_TIMESTAMP_MS = 0;

interface RawPoint {
  readonly lat: number;
  readonly lng: number;
  readonly elevation: number | null;
  readonly timestampMs: number | null;
}

/** Parse a string as a finite float. Returns `null` for NaN and infinities. */
export function tryParseFloat(raw: string): number | null {
  const asNumber = Number.parseFloat(raw);
  return Number.isFinite(asNumber) ? asNumber : null;
}

/**
 * Parse an ISO-8601 datetime string into milliseconds since epoch. Returns
 * `null` for malformed input, or anything `Date` deserialises to `NaN`.
 */
export function tryParseDate(raw: string): number | null {
  const parsedMs = Date.parse(raw);
  return Number.isFinite(parsedMs) ? parsedMs : null;
}

function extractTrackPoints(xml: string): readonly RawPoint[] {
  const collected: RawPoint[] = [];
  // `String.prototype.replace` exposes the full match as a non-optional
  // `string` (no `noUncheckedIndexedAccess` noise), so we use it as a
  // streaming iterator over `<trkpt>` elements. The returned string is
  // discarded — only the side-effect of pushing into `collected` matters.
  xml.replace(TRKPT_TAG_PATTERN, (fullMatch) => {
    const latMatch = LATITUDE_ATTRIBUTE_PATTERN.exec(fullMatch);
    const lonMatch = LONGITUDE_ATTRIBUTE_PATTERN.exec(fullMatch);
    if (latMatch === null || lonMatch === null) return fullMatch;
    const lat = tryParseFloat(latMatch[0]);
    const lng = tryParseFloat(lonMatch[0]);
    if (lat === null || lng === null) return fullMatch;
    const eleMatch = ELE_PATTERN.exec(fullMatch);
    const elevation = eleMatch === null ? null : tryParseFloat(eleMatch[0]);
    // `<time>` is matched inside the trkpt slice, so the regex cannot
    // contaminate the per-point timestamp with a sibling tag like
    // `<metadata><time>`.
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

/**
 * Build the cumulative normalised time fractions for a series of point
 * timestamps. Returns `null` if any timestamp is `null` (timing-partial
 * invalidates the whole series) or if the elapsed span is not strictly
 * positive — which also covers the empty and single-point series, whose
 * span is zero.
 *
 * The last element is forced to exactly `1` via the final-division shape
 * (`(timestampMs[i] - first) / (last - first)`), so floating-point drift
 * cannot leave `arr[n-1]` at `0.9999…` and trip the Zod refine.
 */
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

/**
 * Build the parallel array of per-point elevations. Returns `null` if any
 * element is `null` (all-or-nothing convention — same shape as
 * {@link buildPointTimeFractions}), otherwise the elevations as a fresh
 * `number[]`.
 */
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
 * Parse a GPX file and derive the metadata needed for an edition setup.
 *
 * Throws {@link GpxParseError} when the input is empty, lacks a `<gpx>` or
 * `<trk>` root, or contains no usable `<trkpt>` elements.
 */
/**
 * @Blueprint core-parser-named-error
 * @BlueprintName Core Parser With A Named Error
 * @BlueprintUsage Use for a hand written parser. Export its own error type and say in the header why no library does the job.
 * @BlueprintDescription Parses the file with regular expressions whose delimiters sit in lookarounds so each match types as a plain string, throws the module's own `GpxParseError` for the two inputs it cannot use, and records in the header that the alternative library needs a DOM implementation the Lambda bundle would otherwise carry.
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
  // The D+ derivation drops the missing slots (filter); the parallel-array
  // preservation rejects the whole series when any slot is missing
  // (all-or-nothing). Two different consumers, two different shapes.
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
