const CLEARED_SCORE_TEXT = '';

// @FollowsBlueprint utils-pure-module
export function toScoreEditText(committedScore: number): string {
  return Number.isNaN(committedScore) ? CLEARED_SCORE_TEXT : String(committedScore);
}
