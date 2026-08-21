export const LAST_PENDING_MUTATION_COUNT = 1;

export function isLastPendingMutation(activeMutationCount: number): boolean {
  return activeMutationCount <= LAST_PENDING_MUTATION_COUNT;
}

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
