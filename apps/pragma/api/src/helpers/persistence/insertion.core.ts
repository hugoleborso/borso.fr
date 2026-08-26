export type InsertionOutcome = 'inserted' | 'already-present';

// @FollowsBlueprint helper-module
export function selectInsertionOutcome(insertedRowCount: number): InsertionOutcome {
  return insertedRowCount > 0 ? 'inserted' : 'already-present';
}
