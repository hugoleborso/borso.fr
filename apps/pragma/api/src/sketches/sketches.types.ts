import type { SketchRefusal } from '@domain/sketch.core';
import type { sketchClipTable, sketchLaneTable } from './sketches.schema';

export type { SketchRefusal } from '@domain/sketch.core';

export type SketchLaneRow = typeof sketchLaneTable.$inferSelect;
export type SketchClipRow = typeof sketchClipTable.$inferSelect;
export type SketchClipPlacement = Omit<SketchClipRow, 'inspirationId'>;

export interface SketchView {
  readonly songId: string;
  readonly lanes: readonly SketchLaneRow[];
  readonly clips: readonly SketchClipRow[];
}

// @FollowsBlueprint domain-refusal-with-reason
export interface SketchRefused {
  readonly kind: 'refused';
  readonly reason: SketchRefusal;
}

export type SketchReadOutcome =
  | { readonly kind: 'ok'; readonly sketch: SketchView }
  | SketchRefused;

export type SketchLaneOutcome =
  | { readonly kind: 'ok'; readonly lane: SketchLaneRow }
  | SketchRefused;

export type SketchClipOutcome =
  | { readonly kind: 'ok'; readonly clip: SketchClipRow }
  | SketchRefused;

export type SketchDeletionOutcome = { readonly kind: 'ok' } | SketchRefused;
