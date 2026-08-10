/**
 * The one decision behind `<Show>`: a boolean becomes a key into the table of
 * renderers, so no component has to hold the branch itself.
 */

export type Visibility = 'shown' | 'hidden';

// @FollowsBlueprint core-view-intent
export function selectVisibility(isShown: boolean): Visibility {
  return isShown ? 'shown' : 'hidden';
}
