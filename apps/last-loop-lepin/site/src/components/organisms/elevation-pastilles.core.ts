/**
 * Where each runner sits on the elevation profile, computed as values.
 *
 * The profile shares its along the track fraction with the map, so a runner
 * appears at the same point on both surfaces. A runner resting at the corral
 * carries no pastille, because the profile has no corral to show them at.
 */

import type { RaceEditionDto, RankedRunnerDto } from '../../lib/race.types';
import { buildRunnerAvatar } from '../../lib/runner-avatar.utils';
import { type RaceTimingInputs, runnerDistanceFraction } from './course-map.utils';
import type { ProfileGeometry } from './elevation-profile.utils';

const MINIMUM_PROFILE_POINTS = 2;

export interface ElevationPastille {
  readonly runnerKey: string;
  readonly runnerSlug: string;
  readonly centerX: number;
  readonly centerY: number;
  readonly initials: string;
  readonly backgroundColor: string;
  readonly photoUrl: string | null;
}

/**
 * Whether the edition's track carries enough elevation samples to draw a
 * profile. A GPX without an elevation on every point produces none.
 */
export function hasElevationSamples(edition: RaceEditionDto): boolean {
  const pointElevations = edition.gpx.trackJson.pointElevations;
  if (pointElevations === undefined) return false;
  if (pointElevations.length < MINIMUM_PROFILE_POINTS) return false;
  return edition.gpx.trackJson.points.length >= MINIMUM_PROFILE_POINTS;
}

export function listElevationPastilles(
  edition: RaceEditionDto,
  ranked: readonly RankedRunnerDto[],
  nowMs: number,
  geometry: ProfileGeometry,
  viewBoxWidth: number,
): readonly ElevationPastille[] {
  const timingInputs: RaceTimingInputs = {
    status: edition.status,
    startsAt: edition.startsAt,
    intervalMinutes: edition.intervalMinutes,
  };
  const pastilles: ElevationPastille[] = [];
  for (const entry of ranked) {
    const computed = runnerDistanceFraction(timingInputs, entry, nowMs);
    if (computed === null) continue;
    if (computed.restingAtCorral) continue;
    const avatar = buildRunnerAvatar({
      displayName: entry.runner.displayName,
      photoUrl: entry.runner.photoUrl,
    });
    const fallback = avatar.kind === 'photo' ? avatar.fallback : avatar;
    pastilles.push({
      runnerKey: `${entry.runner.editionSlug}-${entry.runner.slug}`,
      runnerSlug: entry.runner.slug,
      centerX: computed.fraction * viewBoxWidth,
      centerY: geometry.yAt(computed.fraction),
      initials: fallback.initials,
      backgroundColor: fallback.backgroundColor,
      photoUrl: avatar.kind === 'photo' ? avatar.url : null,
    });
  }
  return pastilles;
}
