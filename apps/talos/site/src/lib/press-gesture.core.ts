export const LONG_PRESS_DELAY_MS = 450;
const MOVE_TOLERANCE_PX = 10;
const SWIPE_COMMIT_PX = 80;
const MAXIMUM_SWIPE_PX = 112;

export interface PointerPoint {
  readonly x: number;
  readonly y: number;
}

// @FollowsBlueprint core-view-intent
export function hasMovedBeyondTolerance(start: PointerPoint, current: PointerPoint): boolean {
  return Math.hypot(current.x - start.x, current.y - start.y) > MOVE_TOLERANCE_PX;
}

export function selectSwipeOffset(start: PointerPoint, current: PointerPoint): number {
  const horizontal = current.x - start.x;
  const vertical = Math.abs(current.y - start.y);
  if (horizontal <= vertical) return 0;
  return Math.min(horizontal, MAXIMUM_SWIPE_PX);
}

export function isSwipeCommitted(offset: number): boolean {
  return offset >= SWIPE_COMMIT_PX;
}
