export const SWIPE_CLOSE_DISTANCE_PX = 96;

// @FollowsBlueprint utils-pure-module
export function followSwipeDown(startY: number, currentY: number): number {
  return Math.max(0, currentY - startY);
}

// @FollowsBlueprint utils-pure-module
export function shouldCloseAfterSwipe(swipedDistancePx: number): boolean {
  return swipedDistancePx >= SWIPE_CLOSE_DISTANCE_PX;
}
