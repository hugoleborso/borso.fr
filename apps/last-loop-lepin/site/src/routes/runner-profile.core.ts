const EX_AEQUO = 'ex-aequo';

export function isLoadingRunnerProfile(hasFailed: boolean, hasRunner: boolean): boolean {
  if (hasFailed) return false;
  return !hasRunner;
}

// @FollowsBlueprint utils-pure-module
export function formatCurrentRank(
  rank: number | 'ex-aequo' | undefined,
  exAequoLabel: string,
  emptyLabel: string,
): string {
  if (rank === undefined) return emptyLabel;
  if (rank === EX_AEQUO) return exAequoLabel;
  return `${rank}`;
}
