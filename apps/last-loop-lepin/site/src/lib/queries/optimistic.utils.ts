/**
 * Reconciliation helper for the optimistic mutations in this folder.
 *
 * Each of them writes the cache in `onMutate` and reconciles in `onSettled`
 * through `invalidateQueries`. When several writes of the same family run
 * back to back, an early invalidation fires a refetch that can resolve after a
 * later optimistic write and overwrite it, so the value visibly snaps back.
 * Guarding the invalidation until the family has drained keeps `onMutate` the
 * single source of truth during a burst, and the reconciling refetch happens
 * once, at the end.
 *
 * `queryClient.isMutating({ mutationKey })` counts the settling mutation
 * itself, so a count of one means this is the last one standing.
 *
 * pragma carries the same helper. CLAUDE.md forbids cross application imports,
 * so the two copies are the sanctioned cost of that rule rather than drift.
 */
export const LAST_PENDING_MUTATION_COUNT = 1;

// @FollowsBlueprint utils-pure-module
export function isLastPendingMutation(activeMutationCount: number): boolean {
  return activeMutationCount <= LAST_PENDING_MUTATION_COUNT;
}

interface Slugged {
  readonly slug: string;
}

/**
 * Rewrites the one entity a mutation touched and leaves the rest of the list
 * alone, which is what an `onMutate` in this folder does to the cached list.
 *
 * `rewrite` rather than a patch object, because what a write changes differs
 * per mutation while the walk over the list does not.
 */
// @FollowsBlueprint utils-pure-module
export function replaceEntityBySlug<TEntity extends Slugged>(
  entities: readonly TEntity[],
  slug: string,
  rewrite: (entity: TEntity) => TEntity,
): TEntity[] {
  return entities.map((entity) => (entity.slug === slug ? rewrite(entity) : entity));
}
