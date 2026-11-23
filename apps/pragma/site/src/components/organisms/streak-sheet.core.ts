interface RankedMember {
  readonly firstName: string;
  readonly flame: { readonly days: number };
}

// @FollowsBlueprint core-decision
export function sortMembersByFlame<Member extends RankedMember>(
  members: readonly Member[],
): Member[] {
  return [...members].sort(
    (first, second) =>
      second.flame.days - first.flame.days || first.firstName.localeCompare(second.firstName),
  );
}
