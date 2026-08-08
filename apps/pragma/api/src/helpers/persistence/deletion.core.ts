/**
 * The outcome of a delete, shared by every slice.
 *
 * A repository returns this instead of a bare boolean, so the caller
 * reads `outcome === 'not-found'` rather than guessing which way round
 * `true` meant, and the controller maps the same word to its 404.
 */

export type DeletionOutcome = 'deleted' | 'not-found';

export function selectDeletionOutcome(deletedRowCount: number): DeletionOutcome {
  return deletedRowCount > 0 ? 'deleted' : 'not-found';
}
