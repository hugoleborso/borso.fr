/** @Feature mastery */

const GOOD_SCORE_FLOOR = 7;
const WARN_SCORE_FLOOR = 5;

// @FollowsBlueprint core-appearance
export function selectMasteryTextClass(score: number | null): string {
  if (score === null) return 'text-ink-faint';
  if (score >= GOOD_SCORE_FLOOR) return 'text-good';
  if (score >= WARN_SCORE_FLOOR) return 'text-warn';
  return 'text-danger';
}
