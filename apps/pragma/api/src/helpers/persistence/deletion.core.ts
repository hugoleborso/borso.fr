export type DeletionOutcome = 'deleted' | 'not-found';

// @FollowsBlueprint helper-module
export function selectDeletionOutcome(deletedRowCount: number): DeletionOutcome {
  return deletedRowCount > 0 ? 'deleted' : 'not-found';
}
