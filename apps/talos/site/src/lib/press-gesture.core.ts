export const LONG_PRESS_DELAY_MS = 450;
const MOVE_TOLERANCE_PX = 10;
const SWIPE_COMMIT_PX = 80;
const MAXIMUM_SWIPE_PX = 112;

export interface PointerPoint {
  readonly x: number;
  readonly y: number;
}

export type SwipeDirection = 'right' | 'left';

export interface SwipeDirections {
  readonly right: boolean;
  readonly left: boolean;
}

// @FollowsBlueprint core-view-intent
export function hasMovedBeyondTolerance(start: PointerPoint, current: PointerPoint): boolean {
  return Math.hypot(current.x - start.x, current.y - start.y) > MOVE_TOLERANCE_PX;
}

export function selectSwipeOffset(
  start: PointerPoint,
  current: PointerPoint,
  directions: SwipeDirections,
): number {
  const horizontal = current.x - start.x;
  const vertical = Math.abs(current.y - start.y);
  if (Math.abs(horizontal) <= vertical) return 0;
  // Stryker disable next-line EqualityOperator: equivalent mutant, a drag with no horizontal travel has already returned at rest on the line above.
  const isOffered = horizontal > 0 ? directions.right : directions.left;
  if (!isOffered) return 0;
  return Math.max(-MAXIMUM_SWIPE_PX, Math.min(horizontal, MAXIMUM_SWIPE_PX));
}

export function selectCommittedSwipe(offset: number): SwipeDirection | null {
  if (offset >= SWIPE_COMMIT_PX) return 'right';
  if (offset <= -SWIPE_COMMIT_PX) return 'left';
  return null;
}
