import type { compositionTable } from './compositions.schema';

export type CompositionRow = typeof compositionTable.$inferSelect;

// @FollowsBlueprint domain-refusal-with-reason
export type CompositionOutcome =
  | { readonly kind: 'ok'; readonly composition: CompositionRow }
  | { readonly kind: 'composition-not-found' };

export type CompositionDeletion =
  | { readonly kind: 'deleted' }
  | { readonly kind: 'composition-not-found' };
