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

export function hasElevationSamples(edition: RaceEditionDto): boolean {
  const pointElevations = edition.gpx.trackJson.pointElevations;
  if (pointElevations === undefined) return false;
  if (pointElevations.length < MINIMUM_PROFILE_POINTS) return false;
  return edition.gpx.trackJson.points.length >= MINIMUM_PROFILE_POINTS;
}

export interface ElevationPastillesRequest {
  readonly edition: RaceEditionDto;
  readonly ranked: readonly RankedRunnerDto[];
  readonly nowMs: number;
  readonly geometry: ProfileGeometry;
  readonly viewBoxWidth: number;
}

// @FollowsBlueprint core-view-projection
export function listElevationPastilles({
  edition,
  ranked,
  nowMs,
  geometry,
  viewBoxWidth,
}: ElevationPastillesRequest): readonly ElevationPastille[] {
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
