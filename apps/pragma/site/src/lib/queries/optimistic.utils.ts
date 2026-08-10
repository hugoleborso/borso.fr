/**
 * Optimistic-mutation reconciliation helper shared by every feature's
 * query module.
 *
 * Each mutation writes the cache in `onMutate` and reconciles with the
 * server in `onSettled` via `invalidateQueries`. When several mutations
 * of the same family run back-to-back — dragging an energy slider,
 * reordering a setlist, rapid inline edits — an early `invalidateQueries`
 * fires a refetch that can resolve *after* a later optimistic write and
 * overwrite it, so the value visibly snaps back. Guarding the
 * invalidation so it only runs once the family has drained keeps
 * `onMutate` the single source of truth during a burst; the reconciling
 * refetch happens exactly once, at the end.
 *
 * `queryClient.isMutating({ mutationKey })` counts the settling mutation
 * itself, so a count of 1 means "I am the last one standing".
 */
export const LAST_PENDING_MUTATION_COUNT = 1;

export function isLastPendingMutation(activeMutationCount: number): boolean {
  return activeMutationCount <= LAST_PENDING_MUTATION_COUNT;
}

interface Identified {
  readonly id: string;
}

/**
 * Rewrites the one entity a mutation touched and leaves the rest of the list
 * alone, which is what every `onMutate` in this folder does to the cached
 * list.
 *
 * `rewrite` rather than a patch object, because a song merges its update
 * through `mergeSongUpdate` while a bar merges by spreading.
 */
// @FollowsBlueprint utils-pure-module
export function replaceEntityById<TEntity extends Identified>(
  entities: readonly TEntity[],
  id: string,
  rewrite: (entity: TEntity) => TEntity,
): TEntity[] {
  return entities.map((entity) => (entity.id === id ? rewrite(entity) : entity));
}
