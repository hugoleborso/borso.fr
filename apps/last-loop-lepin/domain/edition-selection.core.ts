export type EditionStatusName = 'setup' | 'live' | 'finished';

export interface SelectableEdition {
  readonly status: EditionStatusName;
  readonly startsAt: string | Date;
  readonly endsAt: string | Date;
}

function instantOf(moment: string | Date): number {
  return new Date(moment).getTime();
}

/**
 * @Blueprint domain-shared-selection
 * @BlueprintName Selection Both Sides Read
 * @BlueprintUsage Use for the rule that turns a collection into the one row a screen and an endpoint must agree on.
 * @BlueprintDescription Lives at the workspace level rather than inside either side, because a front end that can apply it optimistically no longer has to read the answer back from an endpoint that would give it the same result a moment later. It takes the dates as either a `Date` or the string a payload carries, which is what lets the API call it on rows from the database and the site call it on the same rows after `JSON`. The last branch sorts every remaining edition rather than the finished ones, because the two branches above already returned for every other status, and a filter no input can distinguish is a claim no test can check.
 */
export function selectCurrentEdition<TEdition extends SelectableEdition>(
  editions: readonly TEdition[],
): TEdition | null {
  const live = editions.find((edition) => edition.status === 'live');
  if (live !== undefined) return live;
  const soonestToStart = editions
    .filter((edition) => edition.status === 'setup')
    .toSorted((left, right) => instantOf(left.startsAt) - instantOf(right.startsAt))[0];
  if (soonestToStart !== undefined) return soonestToStart;
  const lastToEnd = editions.toSorted(
    (left, right) => instantOf(right.endsAt) - instantOf(left.endsAt),
  )[0];
  return lastToEnd ?? null;
}
