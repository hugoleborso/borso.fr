import { haversineDistanceMeters } from '../../lib/haversine.utils';
import {
  buildRunnerAvatar,
  MAP_AVATAR_CLASS,
  MAP_AVATAR_PHOTO_CLASS,
} from '../../lib/runner-avatar.utils';
import type { LatLngDto, RankedRunnerDto } from '../../lib/race.types';
import { selectRunnerAvatarView } from '../molecules/runner-avatar-view.utils';

const ORIGIN: LatLngDto = { lat: 0, lng: 0 };

export interface Indexed {
  readonly points: readonly LatLngDto[];
  readonly cumulative: readonly number[];
  readonly total: number;
}

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

export function projectFraction(track: Indexed, fraction: number): LatLngDto {
  const clamped = Math.max(0, Math.min(1, fraction));
  return interpolateAlong(track.points, track.cumulative, clamped * track.total);
}

export function projectFractionAlongMonotonicTimeFractions(
  track: Indexed,
  fraction: number,
  monotonicPointTimeFractions: readonly number[],
): LatLngDto {
  const clamped = Math.max(0, Math.min(1, fraction));
  return interpolateAlong(track.points, monotonicPointTimeFractions, clamped);
}

const MINUTES_TO_MS = 60_000;

const MAP_AVATAR_PX = 28;
const HTML_AMP = /&/g;
const HTML_LT = /</g;
const HTML_GT = />/g;
const HTML_DQ = /"/g;
const HTML_SQ = /'/g;

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
  initials: string,
  backgroundColor: string,
): string {
  return `<span class="${MAP_AVATAR_CLASS}" data-runner-slug="${escapeHtml(input.slug)}" data-surface="map" style="width:${MAP_AVATAR_PX}px;height:${MAP_AVATAR_PX}px;background:${escapeHtml(backgroundColor)}">${escapeHtml(initials)}</span>`;
}

export function avatarHtmlWithPhoto(input: AvatarHtmlInput): string {
  const avatar = buildRunnerAvatar({ displayName: input.displayName, photoUrl: input.photoUrl });
  const view = selectRunnerAvatarView(avatar, false);
  const initialsHtml = initialsSpanHtml(input, view.initials, view.backgroundColor);
  if (view.kind === 'initials') return initialsHtml;
  const escapedInitialsHtmlJson = escapeHtml(JSON.stringify(initialsHtml));
  return `<span class="${MAP_AVATAR_CLASS}" data-runner-slug="${escapeHtml(input.slug)}" data-surface="map" style="width:${MAP_AVATAR_PX}px;height:${MAP_AVATAR_PX}px"><img class="${MAP_AVATAR_PHOTO_CLASS}" src="${escapeHtml(view.photoUrl)}" alt="${escapeHtml(input.displayName)}" style="width:${MAP_AVATAR_PX}px;height:${MAP_AVATAR_PX}px" onerror="this.parentNode.innerHTML=${escapedInitialsHtmlJson}"></span>`;
}

export interface RaceTimingInputs {
  readonly status: 'setup' | 'live' | 'finished';
  readonly startsAt: string;
  readonly intervalMinutes: number;
}

export interface RunnerDistanceFraction {
  readonly fraction: number;
  readonly restingAtCorral: boolean;
}

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
