/** @Feature live-invalidation */

import type { WrittenApiRoot } from '@domain/stale-scope.core';
import type { QueryClient, QueryKey, Updater } from '@tanstack/react-query';
import { selectQueryRootsDerivedFrom } from './query-read-roots.core';

/**
 * @Blueprint query-write-keeping-staleness
 * @BlueprintName Cache Write That Keeps Another Member's Staleness
 * @BlueprintUsage Use for every `setQueryData` a mutation makes on a key a stale message can invalidate, in `onMutate`, `onSuccess` and the `onError` rollback alike.
 * @BlueprintDescription `setQueryData` records a fresh fetch, so it clears the invalidation a stale message set and stamps the entry as just loaded. A member who writes after another member's write would then keep the other member's change hidden behind a list marked fresh, across a reload too, since the persisted cache keeps that freshness. Writing through this function puts the invalidation back when the entry already had it, with `Query.invalidate`, which marks the entry stale without refetching, so the write never triggers the read-after-write `GET` the optimistic blueprints refuse.
 */
export function writeKeepingStaleness<Data>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  update: Updater<Data | undefined, Data | undefined>,
): void {
  const query = queryClient.getQueryCache().find<Data>({ queryKey, exact: true });
  const wasStale = query?.state.isInvalidated === true;
  queryClient.setQueryData<Data>(queryKey, update);
  if (wasStale) query.invalidate();
}

export function writeEachKeepingStaleness<Data>(
  queryClient: QueryClient,
  queryKeyPrefix: QueryKey,
  update: Updater<Data | undefined, Data | undefined>,
): void {
  for (const query of queryClient.getQueryCache().findAll({ queryKey: queryKeyPrefix })) {
    writeKeepingStaleness<Data>(queryClient, query.queryKey, update);
  }
}

export function refreshReadsDerivedFrom(
  queryClient: QueryClient,
  written: WrittenApiRoot,
  ownQueryRoot: string,
): void {
  for (const queryRoot of selectQueryRootsDerivedFrom(written, ownQueryRoot)) {
    void queryClient.invalidateQueries({ queryKey: [queryRoot] });
  }
}
