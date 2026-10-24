/** @Feature takes */

export interface MomentComment {
  readonly id: string;
  readonly atSeconds: number | null;
}

export interface MomentMark {
  readonly id: string;
  readonly atSeconds: number;
  readonly offsetPercent: number;
}

const FULL_PERCENT = 100;

// @FollowsBlueprint core-decision
export function isMomentToggleOnByDefault(isPaused: boolean, currentSeconds: number): boolean {
  return isPaused && currentSeconds > 0;
}

export function isMomentToggleOn(
  memberChoice: boolean | null,
  isPaused: boolean,
  currentSeconds: number,
): boolean {
  return memberChoice ?? isMomentToggleOnByDefault(isPaused, currentSeconds);
}

export function selectCommentMoment(
  isMomentOn: boolean,
  currentSeconds: number,
  durationSeconds: number,
): number | null {
  if (!isMomentOn) return null;
  return Math.min(Math.floor(currentSeconds), durationSeconds);
}

// @FollowsBlueprint core-view-projection
export function placeMomentMarks(
  comments: readonly MomentComment[],
  durationSeconds: number,
): MomentMark[] {
  if (durationSeconds <= 0) return [];
  return comments.flatMap((comment) => {
    if (comment.atSeconds === null) return [];
    const offsetPercent = Math.min(
      FULL_PERCENT,
      (comment.atSeconds / durationSeconds) * FULL_PERCENT,
    );
    return [{ id: comment.id, atSeconds: comment.atSeconds, offsetPercent }];
  });
}
