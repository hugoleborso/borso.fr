/**
 * The two readings the runner profile makes while its requests are in flight.
 */

const EX_AEQUO = 'ex-aequo';

/** The page is loading only while the request has neither failed nor landed. */
export function isLoadingRunnerProfile(hasFailed: boolean, hasRunner: boolean): boolean {
  if (hasFailed) return false;
  return !hasRunner;
}

/**
 * The runner's current rank as it is printed. A runner absent from the
 * standings, e.g. before the first loop closes, shows the empty label.
 */
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
