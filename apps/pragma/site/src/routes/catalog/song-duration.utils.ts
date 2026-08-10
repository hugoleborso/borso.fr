/**
 * The running time the MusicBrainz panel prints for a song.
 *
 * MusicBrainz reports a length in whole seconds, and the panel shows it the
 * way a track listing does, so the seconds are always two digits.
 */

const SECONDS_PER_MINUTE = 60;
const SECONDS_LABEL_PAD = 2;

// @FollowsBlueprint utils-formatter
export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return `${minutes}:${String(seconds).padStart(SECONDS_LABEL_PAD, '0')}`;
}
