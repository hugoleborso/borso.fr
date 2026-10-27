/** @Feature takes */

export interface MomentComment {
  readonly id: string;
  readonly atSeconds: number | null;
}

export interface MomentMark {
  readonly id: string;
  readonly atSeconds: number;
  readonly offsetPercent: number;
  readonly reachStartPercent: number;
  readonly reachEndPercent: number;
  readonly offsetInReachPercent: number;
}

interface PlacedMoment {
  readonly id: string;
  readonly atSeconds: number;
  readonly offsetPercent: number;
}

const FULL_PERCENT = 100;
const NO_NEIGHBOUR_BEFORE_PERCENT = -FULL_PERCENT;
const NO_NEIGHBOUR_AFTER_PERCENT = FULL_PERCENT + FULL_PERCENT;
const MIDPOINT_DIVISOR = 2;

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

function halfwayBetween(fromPercent: number, toPercent: number): number {
  return (fromPercent + toPercent) / MIDPOINT_DIVISOR;
}

function placeEachMomentOnce(
  comments: readonly MomentComment[],
  durationSeconds: number,
): PlacedMoment[] {
  const firstCommentAtEachSecond = new Map<number, string>();
  for (const comment of comments) {
    if (comment.atSeconds === null) continue;
    const atSeconds = Math.min(comment.atSeconds, durationSeconds);
    if (!firstCommentAtEachSecond.has(atSeconds))
      firstCommentAtEachSecond.set(atSeconds, comment.id);
  }
  return [...firstCommentAtEachSecond]
    .sort(([earlierSeconds], [laterSeconds]) => earlierSeconds - laterSeconds)
    .map(([atSeconds, id]) => ({
      id,
      atSeconds,
      offsetPercent: (atSeconds / durationSeconds) * FULL_PERCENT,
    }));
}

// @FollowsBlueprint core-view-projection
export function placeMomentMarks(
  comments: readonly MomentComment[],
  durationSeconds: number,
): MomentMark[] {
  if (durationSeconds <= 0) return [];
  const moments = placeEachMomentOnce(comments, durationSeconds);
  return moments.map((moment, index) => {
    const previous = moments[index - 1];
    const next = moments[index + 1];
    const reachStartPercent =
      previous === undefined
        ? NO_NEIGHBOUR_BEFORE_PERCENT
        : halfwayBetween(previous.offsetPercent, moment.offsetPercent);
    const reachEndPercent =
      next === undefined
        ? NO_NEIGHBOUR_AFTER_PERCENT
        : halfwayBetween(moment.offsetPercent, next.offsetPercent);
    const offsetInReachPercent =
      ((moment.offsetPercent - reachStartPercent) / (reachEndPercent - reachStartPercent)) *
      FULL_PERCENT;
    return { ...moment, reachStartPercent, reachEndPercent, offsetInReachPercent };
  });
}
