import type { RaceEditionDto } from '../../lib/race.types';

// @FollowsBlueprint core-label-key
export function selectDistanceLabelKey(
  edition: RaceEditionDto,
): 'common.distance' | 'spectator.track-pending' {
  if (edition.gpx.distanceMeters > 0) return 'common.distance';
  return 'spectator.track-pending';
}
