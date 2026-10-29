/** @Feature studies */

interface StudyTarget {
  readonly songId: string;
  readonly instrumentId: string;
}

interface QueueRow extends StudyTarget {
  readonly isStudiedToday: boolean;
}

interface OverviewShape<TRow extends QueueRow> {
  readonly queue: readonly TRow[];
}

function isTarget(row: StudyTarget, target: StudyTarget): boolean {
  return row.songId === target.songId && row.instrumentId === target.instrumentId;
}

// @FollowsBlueprint utils-pure-module
export function markStudied<TRow extends QueueRow, TOverview extends OverviewShape<TRow>>(
  overview: TOverview,
  target: StudyTarget,
  isStudiedToday: boolean,
): TOverview {
  return {
    ...overview,
    queue: overview.queue.map((row) => (isTarget(row, target) ? { ...row, isStudiedToday } : row)),
  };
}
