/** @Feature songs */

const SECONDS_PER_MINUTE = 60;
const SECONDS_LABEL_PAD = 2;

// @FollowsBlueprint utils-formatter
export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return `${minutes}:${String(seconds).padStart(SECONDS_LABEL_PAD, '0')}`;
}
