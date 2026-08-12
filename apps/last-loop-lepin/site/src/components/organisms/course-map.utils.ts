/**
 * Pure helpers for `CourseMap.tsx` — track indexing, fraction-to-lat/lng
 * projection (linear and recorded-pace variants). No DOM, no Leaflet, no
 * React: every function is deterministic given its inputs.
 *
 * Why the split: the React component owns the imperative Leaflet
 * lifecycle, but the maths is testable in isolation at 100% coverage.
 */

import { haversineDistanceMeters } from '../../lib/haversine.utils';
import {
  buildRunnerAvatar,
  MAP_AVATAR_CLASS,
  MAP_AVATAR_PHOTO_CLASS,
} from '../../lib/runner-avatar.utils';
import type { LatLngDto, RankedRunnerDto } from '../../lib/race.types';

const ORIGIN: LatLngDto = { lat: 0, lng: 0 };

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
/**
 * @Blueprint utils-geometry
 * @BlueprintName Geometry Utilities Module
 * @BlueprintUsage Use for the coordinate and distance maths behind a map, a chart, or any other drawn surface.
 * @BlueprintDescription Knows nothing about React, Leaflet, or the transport shape: points in, an index of cumulative metres out, with the projections beside it taking that index and a fraction and returning a point. The walk pulls each key from a fresh iterator alongside the `for…of` over the points, which is how the module reads two parallel arrays without the defensive `??` branches `noUncheckedIndexedAccess` forces on array indexing, and it is what lets the module hold full branch coverage.
 */
export function indexTrack(points: readonly LatLngDto[]): Indexed {
  const cumulative: number[] = [];
  let running = 0;
  let previous: LatLngDto | undefined;
  for (const current of points) {
    if (previous !== undefined) {
      running += haversineDistanceMeters(previous, current);
    }
    cumulative.push(running);
    previous = current;
  }
  return { points, cumulative, total: running };
}

function interpolateSegment(start: LatLngDto, end: LatLngDto, localFraction: number): LatLngDto {
  return {
    lat: start.lat + (end.lat - start.lat) * localFraction,
    lng: start.lng + (end.lng - start.lng) * localFraction,
  };
}

/**
 * Interpolate along `points` at `target`, where `keys[i]` is the value of
 * the projection variable at `points[i]`. `keys` must be non-decreasing and
 * start at `0`; both callers below satisfy that (cumulative metres from
 * `indexTrack`, and the Zod-validated recorded time fractions).
 *
 * Walks `points` in a single pass and pulls the matching key from a fresh
 * iterator, so each `point` arrives as `LatLngDto` and each key as `number`
 * without the defensive `??` branches `noUncheckedIndexedAccess` forces on
 * array indexing. A `keys` shorter than `points` ends the walk early and
 * yields the last point seen.
 */
function interpolateAlong(
  points: readonly LatLngDto[],
  keys: readonly number[],
  target: number,
): LatLngDto {
  const first = points[0];
  if (first === undefined) return ORIGIN;
  const keyIterator = keys[Symbol.iterator]();
  let previousPoint = first;
  let previousKey = 0;
  let currentPoint = first;
  let currentKey = 0;
  let isFoundSegment = false;
  for (const point of points) {
    const next = keyIterator.next();
    if (next.done === true) break;
    previousPoint = currentPoint;
    previousKey = currentKey;
    currentPoint = point;
    currentKey = next.value;
    if (currentKey >= target) {
      isFoundSegment = true;
      break;
    }
  }
  if (!isFoundSegment) return currentPoint;
  const segmentSpan = currentKey - previousKey;
  const localFraction = segmentSpan === 0 ? 0 : (target - previousKey) / segmentSpan;
  return interpolateSegment(previousPoint, currentPoint, localFraction);
}

/**
 * Linear time → distance projection: maps `fraction` (`0..1` of the loop
 * duration) to the lat/lng at `fraction × total` meters along the polyline.
 * Used as the silent fallback when the GPX has no recorded per-point
 * timing.
 */
export function projectFraction(track: Indexed, fraction: number): LatLngDto {
  const clamped = Math.max(0, Math.min(1, fraction));
  return interpolateAlong(track.points, track.cumulative, clamped * track.total);
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
  pointTimeFractions: readonly number[],
): LatLngDto {
  const clamped = Math.max(0, Math.min(1, fraction));
  return interpolateAlong(track.points, pointTimeFractions, clamped);
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

function initialsSpanHtml(
  input: AvatarHtmlInput,
  fallbackInitials: string,
  fallbackBg: string,
): string {
  return `<span class="${MAP_AVATAR_CLASS}" data-runner-slug="${escapeHtml(input.slug)}" data-surface="map" style="width:${MAP_AVATAR_PX}px;height:${MAP_AVATAR_PX}px;background:${escapeHtml(fallbackBg)}">${escapeHtml(fallbackInitials)}</span>`;
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
  const fallbackHtml = initialsSpanHtml(
    input,
    avatar.fallback.initials,
    avatar.fallback.backgroundColor,
  );
  // `onerror` rewrites the wrapper's innerHTML to the initials span. The
  // wrapper itself sticks around (its size + class anchor the Leaflet icon
  // bounding box), so the swap is a contained DOM mutation that survives
  // re-paints of nearby markers. The JSON string is HTML-attribute-escaped
  // (the raw `JSON.stringify` output starts with `"` which would close the
  // attribute mid-flight and leak the rest of the markup into the DOM).
  // The browser decodes `&quot;` back to `"` when reading the attribute,
  // then JS evaluates the string literal as written.
  const escapedFallbackJson = escapeHtml(JSON.stringify(fallbackHtml));
  return `<span class="${MAP_AVATAR_CLASS}" data-runner-slug="${escapeHtml(input.slug)}" data-surface="map" style="width:${MAP_AVATAR_PX}px;height:${MAP_AVATAR_PX}px"><img class="${MAP_AVATAR_PHOTO_CLASS}" src="${escapeHtml(avatar.url)}" alt="${escapeHtml(input.displayName)}" style="width:${MAP_AVATAR_PX}px;height:${MAP_AVATAR_PX}px" onerror="this.parentNode.innerHTML=${escapedFallbackJson}"></span>`;
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
  const isRestingAtCorral = entry.status.lastLoop >= currentLoopIndex;
  if (isRestingAtCorral) return { fraction: 0, restingAtCorral: true };
  const currentLoopStartMs = startMs + (currentLoopIndex - 1) * loopMs;
  const elapsedInLoopMs = nowMs - currentLoopStartMs;
  const paceMs = entry.lastLoopDurationMs ?? loopMs;
  if (paceMs === 0) return { fraction: 0, restingAtCorral: false };
  return { fraction: elapsedInLoopMs / paceMs, restingAtCorral: false };
}
