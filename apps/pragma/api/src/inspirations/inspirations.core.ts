import type {
  InspirationDeletionDecision,
  InspirationRow,
  InspirationUsage,
  InspirationView,
  SketchUsingInspiration,
} from './inspirations.types';

function listSketchesOf(usages: readonly InspirationUsage[]): SketchUsingInspiration[] {
  const titleBySong = new Map(usages.map((usage) => [usage.songId, usage.songTitle]));
  return [...titleBySong]
    .map(([songId, title]) => ({ songId, title }))
    .toSorted((first, second) => first.title.localeCompare(second.title));
}

// @FollowsBlueprint core-decision
export function countSketchesByInspiration(
  usages: readonly InspirationUsage[],
): ReadonlyMap<string, number> {
  const songsByInspiration = new Map<string, Set<string>>();
  for (const usage of usages) {
    const songs = songsByInspiration.get(usage.inspirationId) ?? new Set<string>();
    songs.add(usage.songId);
    songsByInspiration.set(usage.inspirationId, songs);
  }
  return new Map([...songsByInspiration].map(([id, songs]) => [id, songs.size]));
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
