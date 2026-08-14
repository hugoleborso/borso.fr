/**
 * Picks between two literals without putting the branch in the component.
 *
 * Almost every button in this application reads one way while a request is in
 * flight and another way at rest, and the same holds for a title that depends
 * on whether the operator is creating or editing.
 */

// @FollowsBlueprint core-label-key
export function selectLabel<TLabel extends string>(
  isFirstChoice: boolean,
  firstChoice: TLabel,
  secondChoice: TLabel,
): TLabel {
  if (isFirstChoice) return firstChoice;
  return secondChoice;
}
