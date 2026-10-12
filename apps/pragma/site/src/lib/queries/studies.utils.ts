/** @Feature studies */

interface StudyTarget {
  readonly songId: string;
  readonly instrumentId: string;
}

interface QueueRow extends StudyTarget {
  readonly isStudiedToday: boolean;
}

interface BandRow<TStreak> {
  readonly memberId: string;
  readonly streak: TStreak;
}

interface OverviewShape<TRow extends QueueRow, TBand extends BandRow<TStreak>, TStreak> {
  readonly myStreak: TStreak;
  readonly queue: readonly TRow[];
  readonly band: readonly TBand[];
}

function isTarget(row: StudyTarget, target: StudyTarget): boolean {
  return row.songId === target.songId && row.instrumentId === target.instrumentId;
}

// @FollowsBlueprint utils-pure-module
export function markStudied<
  TRow extends QueueRow,
  TBand extends BandRow<TStreak>,
  TStreak,
  TOverview extends OverviewShape<TRow, TBand, TStreak>,
>(overview: TOverview, target: StudyTarget, isStudiedToday: boolean): TOverview {
  return {
    ...overview,
    queue: overview.queue.map((row) => (isTarget(row, target) ? { ...row, isStudiedToday } : row)),
  };
}

export function settleOwnStreak<
  TRow extends QueueRow,
  TBand extends BandRow<TStreak>,
  TStreak,
  TOverview extends OverviewShape<TRow, TBand, TStreak>,
>(overview: TOverview, memberId: string, myStreak: TStreak): TOverview {
  return {
    ...overview,
    myStreak,
    band: overview.band.map((member) =>
      member.memberId === memberId ? { ...member, streak: myStreak } : member,
    ),
  };
}
