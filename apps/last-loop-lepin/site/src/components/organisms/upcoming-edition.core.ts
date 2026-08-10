/**
 * An edition announced before its track has been uploaded shows a placeholder
 * where the distance would be, because a distance of zero metres reads as a
 * measurement rather than as a missing one.
 */

import type { RaceEditionDto } from '../../lib/race.types';

export function selectDistanceLabelKey(
  edition: RaceEditionDto,
): 'common.distance' | 'spectator.track-pending' {
  if (edition.gpx.distanceMeters > 0) return 'common.distance';
  return 'spectator.track-pending';
}
