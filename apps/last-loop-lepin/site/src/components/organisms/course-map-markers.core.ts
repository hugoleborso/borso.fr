/**
 * Everything the course map paints, computed as values.
 *
 * The React component owns the Leaflet instance and nothing else: it walks
 * the list this file returns and turns each entry into a marker. Every rule
 * about where a runner sits, what their marker says, and which projection to
 * use therefore has its own test.
 */

import { formatPercent } from '../../lib/formatters.utils';
import type { LatLngDto, RaceEditionDto, RankedRunnerDto } from '../../lib/race.types';
import { selectRunnerStatusLoop } from '../../lib/runner-status.utils';
import {
  avatarHtmlWithPhoto,
  type Indexed,
  indexTrack,
  projectFraction,
  projectFractionTimeAware,
  type RaceTimingInputs,
  runnerDistanceFraction,
} from './course-map.utils';

const MINUTES_TO_MS = 60_000;
const MINIMUM_INTERVAL_MINUTES = 1;

export type ProjectionMode = 'recorded-pace' | 'linear-fallback';

export type MarkerTitleKey = 'course-map.runner-at-corral' | 'course-map.runner-progress';

export interface MarkerTitleParameters {
  readonly name: string;
  readonly loopCount: number;
  readonly loop: number;
  readonly percent: string;
}

export interface RunnerMarker {
  readonly runnerKey: string;
  readonly position: LatLngDto;
  readonly avatarHtml: string;
  readonly titleKey: MarkerTitleKey;
  readonly titleParameters: MarkerTitleParameters;
}

/**
 * Which projection the map uses. Recorded pace needs the per point time
 * fractions the GPX carried; without them the map spreads runners linearly
 * along the track.
 */
export function selectProjectionMode(
  pointTimeFractions: readonly number[] | undefined,
): ProjectionMode {
  if (pointTimeFractions === undefined) return 'linear-fallback';
  return 'recorded-pace';
}

/**
 * The loop the race is currently in. Backyard rule: a loop starts on the top
 * of the hour, not when the previous loop closed, so the index comes from the
 * elapsed race time and not from anybody's punches.
 */
export function projectCurrentLoopIndex(
  startsAt: string,
  intervalMinutes: number,
  nowMs: number,
): number {
  const loopMs = Math.max(intervalMinutes, MINIMUM_INTERVAL_MINUTES) * MINUTES_TO_MS;
  const elapsedMs = Math.max(0, nowMs - new Date(startsAt).getTime());
  return Math.floor(elapsedMs / loopMs) + 1;
}

function projectPosition(
  track: Indexed,
  fraction: number,
  pointTimeFractions: readonly number[] | undefined,
): LatLngDto {
  if (pointTimeFractions === undefined) return projectFraction(track, fraction);
  return projectFractionTimeAware(track, fraction, pointTimeFractions);
}

function describeMarkerTitle(
  entry: RankedRunnerDto,
  isRestingAtCorral: boolean,
  fraction: number,
  currentLoopIndex: number,
): { key: MarkerTitleKey; parameters: MarkerTitleParameters } {
  const loopCount = selectRunnerStatusLoop(entry.status);
  const parameters: MarkerTitleParameters = {
    name: entry.runner.displayName,
    loopCount,
    loop: currentLoopIndex,
    percent: formatPercent(fraction),
  };
  if (isRestingAtCorral) return { key: 'course-map.runner-at-corral', parameters };
  return { key: 'course-map.runner-progress', parameters };
}

/**
 * One marker per runner the map should show. Runners who are out, and every
 * runner while the edition is not live, produce no marker, and neither does
 * an edition whose track carries no length.
 */
export function listRunnerMarkers(
  edition: RaceEditionDto,
  ranked: readonly RankedRunnerDto[],
  nowMs: number,
): readonly RunnerMarker[] {
  const track = indexTrack(edition.gpx.trackJson.points);
  if (track.total === 0) return [];
  const pointTimeFractions = edition.gpx.trackJson.pointTimeFractions;
  const timingInputs: RaceTimingInputs = {
    status: edition.status,
    startsAt: edition.startsAt,
    intervalMinutes: edition.intervalMinutes,
  };
  const currentLoopIndex = projectCurrentLoopIndex(
    edition.startsAt,
    edition.intervalMinutes,
    nowMs,
  );
  const markers: RunnerMarker[] = [];
  for (const entry of ranked) {
    const computed = runnerDistanceFraction(timingInputs, entry, nowMs);
    if (computed === null) continue;
    const title = describeMarkerTitle(
      entry,
      computed.restingAtCorral,
      computed.fraction,
      currentLoopIndex,
    );
    markers.push({
      runnerKey: `${entry.runner.editionSlug}-${entry.runner.slug}`,
      position: projectPosition(track, computed.fraction, pointTimeFractions),
      avatarHtml: avatarHtmlWithPhoto({
        displayName: entry.runner.displayName,
        photoUrl: entry.runner.photoUrl,
        slug: entry.runner.slug,
      }),
      titleKey: title.key,
      titleParameters: title.parameters,
    });
  }
  return markers;
}
