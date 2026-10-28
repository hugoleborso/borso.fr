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
  readonly studiesThisWeek: number;
}

export interface OwnLine<TStreak> {
  readonly streak: TStreak;
  readonly studiesThisWeek: number;
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

export function settleOwnLine<
  TRow extends QueueRow,
  TBand extends BandRow<TStreak>,
  TStreak,
  TOverview extends OverviewShape<TRow, TBand, TStreak>,
>(overview: TOverview, memberId: string, ownLine: OwnLine<TStreak>): TOverview {
  return {
    ...overview,
    myStreak: ownLine.streak,
    band: overview.band.map((member) =>
      member.memberId === memberId
        ? { ...member, streak: ownLine.streak, studiesThisWeek: ownLine.studiesThisWeek }
        : member,
    ),
  };
}
