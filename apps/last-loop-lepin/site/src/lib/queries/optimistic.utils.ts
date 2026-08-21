export const LAST_PENDING_MUTATION_COUNT = 1;

// @FollowsBlueprint utils-pure-module
export function isLastPendingMutation(activeMutationCount: number): boolean {
  return activeMutationCount <= LAST_PENDING_MUTATION_COUNT;
}

interface Slugged {
  readonly slug: string;
}

// @FollowsBlueprint utils-pure-module
export function replaceEntityBySlug<TEntity extends Slugged>(
  entities: readonly TEntity[],
  slug: string,
  rewrite: (entity: TEntity) => TEntity,
): TEntity[] {
  return entities.map((entity) => (entity.slug === slug ? rewrite(entity) : entity));
}
