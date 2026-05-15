/**
 * Pure helpers for `CourseMap.tsx` — track indexing, fraction-to-lat/lng
 * projection (linear and recorded-pace variants). No DOM, no Leaflet, no
 * React: every function is deterministic given its inputs.
 *
 * Why the split: the React component owns the imperative Leaflet
 * lifecycle, but the maths is testable in isolation at 100% coverage.
 */

import { buildRunnerAvatar } from '../domain/runner-avatar.utils';
import type { LatLngDto, RankedRunnerDto } from '../domain/types';

const EARTH_RADIUS_METERS = 6_371_000;
const DEGREES_PER_HALF_TURN = 180;
const ORIGIN: LatLngDto = { lat: 0, lng: 0 };

/**
 * Squared Euclidean distance in lat/lng degrees — fine for "which segment
 * am I on" comparisons over a single loop (Lépin's track fits in <0.01° of
 * lat/lng, where the great-circle vs. plane error is below 0.1 m). We only
 * need the *ordering* to identify the right segment, not the metric.
 */
export function squaredDegrees(a: LatLngDto, b: LatLngDto): number {
  const deltaLat = a.lat - b.lat;
  const deltaLng = a.lng - b.lng;
  return deltaLat * deltaLat + deltaLng * deltaLng;
}

/**
 * Great-circle distance in meters between two lat/lng points. Same
 * formulation as `geo.core.polylineDistanceMeters` on the back; the bounding
 * box for Lépin's loop is small enough that floating-point cancellation
 * isn't a concern here.
 */
export function metersBetween(a: LatLngDto, b: LatLngDto): number {
  const latRadiansA = (a.lat * Math.PI) / DEGREES_PER_HALF_TURN;
  const latRadiansB = (b.lat * Math.PI) / DEGREES_PER_HALF_TURN;
  const deltaLat = ((b.lat - a.lat) * Math.PI) / DEGREES_PER_HALF_TURN;
  const deltaLng = ((b.lng - a.lng) * Math.PI) / DEGREES_PER_HALF_TURN;
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(latRadiansA) * Math.cos(latRadiansB) * Math.sin(deltaLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

export interface Indexed {
  readonly points: readonly LatLngDto[];
  readonly cumulative: readonly number[];
  readonly total: number;
}

/**
 * Build the cumulative-distance index used by both projection algorithms.
 * `cumulative[i]` is the polyline length from `points[0]` to `points[i]` in
 * meters; `total` is the loop length (= `cumulative[last]`, or `0` for an
 * empty or single-point series).
 */
export function indexTrack(points: readonly LatLngDto[]): Indexed {
  const cumulative: number[] = [];
  let running = 0;
  let previous: LatLngDto | undefined;
  for (const current of points) {
    if (previous !== undefined) {
      running += metersBetween(previous, current);
    }
    cumulative.push(running);
    previous = current;
  }
  return { points, cumulative, total: running };
}

function interpolateSegment(
  start: LatLngDto,
  end: LatLngDto,
  localFraction: number,
): LatLngDto {
  return {
    lat: start.lat + (end.lat - start.lat) * localFraction,
    lng: start.lng + (end.lng - start.lng) * localFraction,
  };
}

/**
 * Linear time → distance projection: maps `fraction` (`0..1` of the loop
 * duration) to the lat/lng at `fraction × total` meters along the polyline.
 * Used as the silent fallback when the GPX has no recorded per-point
 * timing.
 */
export function projectFraction(track: Indexed, fraction: number): LatLngDto {
  const first = track.points[0];
  if (first === undefined) return ORIGIN;
  if (track.points.length === 1 || track.total === 0) return first;
  const target = Math.max(0, Math.min(1, fraction)) * track.total;
  // Walk segments by iterating `points` directly — each `current` arrives
  // as `LatLngDto` (not `LatLngDto | undefined`), sidestepping
  // `noUncheckedIndexedAccess`'s defensive `??` branches. `cumulativeDistance`
  // is recomputed alongside, mirroring `track.cumulative` without indexing.
  let segmentStart = first;
  let segmentEnd = first;
  let segmentStartMeters = 0;
  let segmentEndMeters = 0;
  let previousPoint = first;
  let cumulativeDistance = 0;
  let isFirstIteration = true;
  for (const current of track.points) {
    if (isFirstIteration) {
      isFirstIteration = false;
      continue;
    }
    const stepLength = metersBetween(previousPoint, current);
    segmentStart = previousPoint;
    segmentEnd = current;
    segmentStartMeters = cumulativeDistance;
    cumulativeDistance += stepLength;
    segmentEndMeters = cumulativeDistance;
    previousPoint = current;
    if (cumulativeDistance >= target) break;
  }
  const segmentLength = segmentEndMeters - segmentStartMeters;
  const localFraction =
    segmentLength === 0 ? 0 : (target - segmentStartMeters) / segmentLength;
  return interpolateSegment(segmentStart, segmentEnd, localFraction);
}

/**
 * Recorded-pace time → distance projection: maps `fraction` (`0..1` of the
 * loop duration) to the lat/lng at the matching position on the polyline,
 * using the recorded `pointTimeFractions` as the time → index function.
 *
 * The avatar therefore moves at the recorded pace of the source GPX — slow
 * on the recorded uphills, fast on the recorded downhills — instead of the
 * naive linear-distance interpolation.
 *
 * Callers must pass a `pointTimeFractions` that has already been validated
 * by the read-side Zod refine (length parity with `track.points`, strict
 * monotonicity, starts at 0, ends at 1). The function does not re-validate.
 */
export function projectFractionTimeAware(
  track: Indexed,
  fraction: number,
  pointTimeFractions: ReadonlyArray<number>,
): LatLngDto {
  const first = track.points[0];
  if (first === undefined) return ORIGIN;
  if (track.points.length === 1) return first;
  const clamped = Math.max(0, Math.min(1, fraction));
  // Walk `points` in a single pass; pull a matching fraction from a fresh
  // iterator on `pointTimeFractions`. The for-of yields each `point` as
  // `LatLngDto` (not `LatLngDto | undefined`) and the iterator yields each
  // fraction as `number` once we've ruled out the `done` end. The Zod
  // refine guarantees length parity at the read boundary, so the `done`
  // branch only fires on degenerate input (different lengths).
  const fractionIterator = pointTimeFractions[Symbol.iterator]();
  let previousPoint = first;
  let previousFraction = 0;
  let currentPoint = first;
  let currentFraction = 0;
  let foundSegment = false;
  let isFirstPoint = true;
  for (const pointAtIndex of track.points) {
    const next = fractionIterator.next();
    if (next.done === true) break;
    const fractionAtIndex = next.value;
    if (isFirstPoint) {
      isFirstPoint = false;
      continue;
    }
    previousPoint = currentPoint;
    previousFraction = currentFraction;
    currentPoint = pointAtIndex;
    currentFraction = fractionAtIndex;
    if (fractionAtIndex >= clamped) {
      foundSegment = true;
      break;
    }
  }
  if (!foundSegment) {
    // Exhausted the iterator without finding any fraction ≥ `clamped`.
    // Happens when `pointTimeFractions[last] < clamped`, which is only
    // possible if the array is shorter than `points` (length parity is
    // enforced by Zod at the read boundary, so this is degenerate input)
    // or every fraction was < `clamped` (impossible when the refine
    // guarantees `ptf[last] === 1 ≥ clamped`). Either way the safest
    // answer is the last point we saw.
    return currentPoint;
  }
  const segmentSpan = currentFraction - previousFraction;
  const localFraction =
    segmentSpan === 0 ? 0 : (clamped - previousFraction) / segmentSpan;
  return interpolateSegment(previousPoint, currentPoint, localFraction);
}

const MINUTES_TO_MS = 60_000;

const MAP_AVATAR_PX = 28;
const HTML_AMP = /&/g;
const HTML_LT = /</g;
const HTML_GT = />/g;
const HTML_DQ = /"/g;
const HTML_SQ = /'/g;

/**
 * Escape a string for safe substitution into an HTML attribute or text
 * node. Conservative — quotes, ampersands, and angle brackets all get
 * entity-encoded. Used by `avatarHtmlWithPhoto` to compose the Leaflet
 * `divIcon` markup from runner-supplied display names + photo URLs.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(HTML_AMP, '&amp;')
    .replace(HTML_LT, '&lt;')
    .replace(HTML_GT, '&gt;')
    .replace(HTML_DQ, '&quot;')
    .replace(HTML_SQ, '&#39;');
}

interface AvatarHtmlInput {
  readonly displayName: string;
  readonly photoUrl: string | null | undefined;
  readonly slug: string;
}

function initialsSpanHtml(input: AvatarHtmlInput, fallbackInitials: string, fallbackBg: string): string {
  return `<span class="runner-avatar runner-avatar--initials map-avatar" data-runner-slug="${escapeHtml(input.slug)}" data-surface="map" style="width:${MAP_AVATAR_PX}px;height:${MAP_AVATAR_PX}px;background:${escapeHtml(fallbackBg)}">${escapeHtml(fallbackInitials)}</span>`;
}

/**
 * Build the HTML string Leaflet's `L.divIcon` ships into the DOM for a
 * runner marker. Mirrors the React `<RunnerAvatar>` component's logic in
 * pure-string form — Leaflet renders raw HTML, so we can't inject a React
 * tree, but the visible output must match. When `photoUrl` is set, we
 * render an `<img>` wrapped by a span; an inline `onerror` rewrites the
 * wrapper's innerHTML to the initials span on load failure (the cascade
 * from spec §"Edge cases — Photo dont l'URL retourne 404"). When
 * `photoUrl` is null, we render the initials span directly.
 *
 * Keep in sync with `RunnerAvatar.tsx` — every visual change there has to
 * mirror here.
 */
export function avatarHtmlWithPhoto(input: AvatarHtmlInput): string {
  const avatar = buildRunnerAvatar({ displayName: input.displayName, photoUrl: input.photoUrl });
  if (avatar.kind === 'initials') {
    return initialsSpanHtml(input, avatar.initials, avatar.backgroundColor);
  }
  const fallbackHtml = initialsSpanHtml(input, avatar.fallback.initials, avatar.fallback.backgroundColor);
  // `onerror` rewrites the wrapper's innerHTML to the initials span. The
  // wrapper itself sticks around (its size + class anchor the Leaflet icon
  // bounding box), so the swap is a contained DOM mutation that survives
  // re-paints of nearby markers.
  return `<span class="runner-avatar map-avatar" data-runner-slug="${escapeHtml(input.slug)}" data-surface="map" style="width:${MAP_AVATAR_PX}px;height:${MAP_AVATAR_PX}px"><img class="runner-avatar--photo" src="${escapeHtml(avatar.url)}" alt="${escapeHtml(input.displayName)}" style="width:${MAP_AVATAR_PX}px;height:${MAP_AVATAR_PX}px" onerror="this.parentNode.innerHTML=${JSON.stringify(fallbackHtml)}"></span>`;
}

/**
 * Narrowed view of `RaceEditionDto` carrying only the four fields needed
 * for the in-loop fraction computation. Decoupling the helper from
 * `RaceEditionDto` lets `course-map.utils.test.ts` build inputs without
 * synthesising the full edition shape, and keeps the function pure.
 */
export interface RaceTimingInputs {
  readonly status: 'setup' | 'live' | 'finished';
  readonly startsAt: string;
  readonly intervalMinutes: number;
}

export interface RunnerDistanceFraction {
  /** `[0, 1)` — position inside the current top-of-hour loop. */
  readonly fraction: number;
  /** `true` when the runner has already closed the current loop and waits at the corral. */
  readonly restingAtCorral: boolean;
}

/**
 * Where the runner sits on the loop relative to the current top-of-hour
 * window. Returns `null` when no avatar should be rendered (edition not
 * live, runner DNF, or empty track inputs upstream of the caller).
 *
 * Called by both `CourseMap.tsx` (to position the lat/lng marker) and
 * `ElevationProfile.tsx` (to position the pastille on the profile). The
 * helper returns only the fraction — the lat/lng / Y projection lives at
 * each call site, since they project onto different curves.
 */
export function runnerDistanceFraction(
  edition: RaceTimingInputs,
  entry: RankedRunnerDto,
  nowMs: number,
): RunnerDistanceFraction | null {
  if (edition.status !== 'live') return null;
  if (entry.status.kind !== 'in-race') return null;
  const loopMs = Math.max(edition.intervalMinutes, 1) * MINUTES_TO_MS;
  const startMs = new Date(edition.startsAt).getTime();
  const elapsedSinceRace = Math.max(0, nowMs - startMs);
  const currentLoopIndex = Math.floor(elapsedSinceRace / loopMs) + 1;
  const restingAtCorral = entry.status.lastLoop >= currentLoopIndex;
  if (restingAtCorral) return { fraction: 0, restingAtCorral: true };
  const currentLoopStartMs = startMs + (currentLoopIndex - 1) * loopMs;
  const elapsedInLoopMs = nowMs - currentLoopStartMs;
  const paceMs = entry.lastLoopDurationMs ?? loopMs;
  if (paceMs === 0) return { fraction: 0, restingAtCorral: false };
  return { fraction: elapsedInLoopMs / paceMs, restingAtCorral: false };
}
