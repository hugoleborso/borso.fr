import type {
  InspirationDeletionDecision,
  InspirationRow,
  InspirationUsage,
  InspirationView,
  SketchUsingInspiration,
} from './inspirations.types';

function listSketchesOf(usages: readonly InspirationUsage[]): SketchUsingInspiration[] {
  const titleByComposition = new Map(
    usages.map((usage) => [usage.compositionId, usage.compositionTitle]),
  );
  return [...titleByComposition]
    .map(([compositionId, title]) => ({ compositionId, title }))
    .toSorted((first, second) => first.title.localeCompare(second.title));
}

// @FollowsBlueprint core-decision
export function countSketchesByInspiration(
  usages: readonly InspirationUsage[],
): ReadonlyMap<string, number> {
  const compositionsByInspiration = new Map<string, Set<string>>();
  for (const usage of usages) {
    const compositions = compositionsByInspiration.get(usage.inspirationId) ?? new Set<string>();
    compositions.add(usage.compositionId);
    compositionsByInspiration.set(usage.inspirationId, compositions);
  }
  return new Map(
    [...compositionsByInspiration].map(([id, compositions]) => [id, compositions.size]),
  );
}

export function projectInspirationViews(
  rows: readonly InspirationRow[],
  usages: readonly InspirationUsage[],
): InspirationView[] {
  const sketchCounts = countSketchesByInspiration(usages);
  return rows.map((row) => ({ ...row, sketchCount: sketchCounts.get(row.id) ?? 0 }));
}

// @FollowsBlueprint core-decision
export function selectInspirationDeletion(
  usages: readonly InspirationUsage[],
): InspirationDeletionDecision {
  if (usages.length === 0) return { kind: 'free' };
  return { kind: 'inspiration-in-use', sketches: listSketchesOf(usages) };
}
