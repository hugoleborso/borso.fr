export type Visibility = 'shown' | 'hidden';

// @FollowsBlueprint core-view-intent
export function selectVisibility(isShown: boolean): Visibility {
  return isShown ? 'shown' : 'hidden';
}
