/**
 * Colour a mastery score is drawn in on a setlist row. An unscored
 * member is neutral; the thresholds match the mastery matrix.
 */

const GOOD_SCORE_FLOOR = 7;
const WARN_SCORE_FLOOR = 5;

// @FollowsBlueprint core-appearance
export function selectMasteryColor(score: number | null): string {
  if (score === null) return 'var(--color-ink-400)';
  if (score >= GOOD_SCORE_FLOOR) return 'var(--color-good)';
  if (score >= WARN_SCORE_FLOOR) return 'var(--color-warn)';
  return 'var(--color-danger)';
}
