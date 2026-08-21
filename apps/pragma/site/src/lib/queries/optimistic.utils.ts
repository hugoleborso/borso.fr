interface Identified {
  readonly id: string;
}

// @FollowsBlueprint utils-pure-module
export function replaceEntityById<TEntity extends Identified>(
  entities: readonly TEntity[],
  id: string,
  rewrite: (entity: TEntity) => TEntity,
): TEntity[] {
  return entities.map((entity) => (entity.id === id ? rewrite(entity) : entity));
}

/**
 * @Blueprint utils-settle-temporary-entity
 * @BlueprintName Settle A Temporary Entity
 * @BlueprintUsage Use to reconcile an optimistic insert from the row the write itself returned, instead of refetching the list to learn the identifier.
 * @BlueprintDescription Swaps the row an insert wrote under a client generated identifier for the row the server answered with, which is the only thing the client did not already know. It is what lets an insert drop its `onSettled` refetch like every other write, and the swap is keyed on the temporary identifier rather than on a position, so a concurrent write landing in between moves the row without losing it.
 */
export function settleTemporaryEntity<TEntity extends Identified>(
  entities: readonly TEntity[],
  temporaryId: string,
  settled: TEntity,
): TEntity[] {
  return entities.map((entity) => (entity.id === temporaryId ? settled : entity));
}
