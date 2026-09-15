/** @Feature setlist-voting */

export function moveWithin(songIds: readonly string[], from: number, target: number): string[] {
  const reordered = [...songIds];
  const [moved] = reordered.splice(from, 1);
  if (moved === undefined) return reordered;
  reordered.splice(target, 0, moved);
  return reordered;
}

export function reorderByDrop(
  songIds: readonly string[],
  draggedSongId: string,
  droppedOnId: string | number | null,
): string[] {
  const from = songIds.indexOf(draggedSongId);
  const target = songIds.indexOf(String(droppedOnId));
  if (from === -1 || target === -1) return [...songIds];
  return moveWithin(songIds, from, target);
}

const TARGET_SONG_COUNT_MIN = 1;
const TARGET_SONG_COUNT_MAX = 60;

export function readTargetSongCount(typed: string, fallback: number): number {
  const typedCount = Number.parseInt(typed, 10);
  if (Number.isNaN(typedCount)) return fallback;
  return Math.min(Math.max(typedCount, TARGET_SONG_COUNT_MIN), TARGET_SONG_COUNT_MAX);
}
