/** @Feature setlists */

import type { SceneKeyCommand } from './setlist-scene.core';

export const SCENE_SWIPE_DISTANCE_PX = 64;
const HORIZONTAL_DOMINANCE = 1.5;

// @FollowsBlueprint core-decision
export function selectSwipeCommand(deltaX: number, deltaY: number): SceneKeyCommand | null {
  const isHorizontal = Math.abs(deltaX) >= Math.abs(deltaY) * HORIZONTAL_DOMINANCE;
  if (!isHorizontal) return null;
  if (deltaX <= -SCENE_SWIPE_DISTANCE_PX) return 'next';
  if (deltaX >= SCENE_SWIPE_DISTANCE_PX) return 'previous';
  return null;
}
