// @FollowsBlueprint core-label-key
export function selectLabel<TLabel extends string>(
  isFirstChoice: boolean,
  firstChoice: TLabel,
  secondChoice: TLabel,
): TLabel {
  if (isFirstChoice) return firstChoice;
  return secondChoice;
}
