import type { inspirationTable } from './inspirations.schema';

type InspirationTableRow = typeof inspirationTable.$inferSelect;

export type InspirationInsert = typeof inspirationTable.$inferInsert;

export type InspirationChanges = Omit<InspirationInsert, 'id' | 'authorMemberId' | 'createdAt'>;

export type InspirationRow = InspirationTableRow & { readonly authorName: string | null };

export type InspirationView = InspirationRow & { readonly sketchCount: number };

export interface InspirationUsage {
  readonly inspirationId: string;
  readonly songId: string;
  readonly songTitle: string;
}

export interface SketchUsingInspiration {
  readonly songId: string;
  readonly title: string;
}

// @FollowsBlueprint domain-refusal-with-reason
export type InspirationWriteOutcome =
  | { readonly kind: 'ok'; readonly inspiration: InspirationView }
  | { readonly kind: 'inspiration-not-found' };

export type InspirationDeletionDecision =
  | { readonly kind: 'free' }
  | { readonly kind: 'inspiration-in-use'; readonly sketches: readonly SketchUsingInspiration[] };

export type InspirationDeletion =
  | { readonly kind: 'deleted' }
  | { readonly kind: 'inspiration-not-found' }
  | { readonly kind: 'inspiration-in-use'; readonly sketches: readonly SketchUsingInspiration[] };
