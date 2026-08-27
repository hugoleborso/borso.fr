export const ROUND_DURATION_MS = 30_000;

const MILLISECONDS_PER_SECOND = 1_000;
const NO_REMAINING_MILLISECONDS = 0;

export interface RoundWindow {
  readonly closesAt: Date;
  readonly settledAt: Date | null;
}

export interface SurvivingVote {
  readonly songId: string;
  readonly castAt: Date;
}

export type RoundSettlement =
  | { readonly kind: 'still-open' }
  | { readonly kind: 'already-settled' }
  | { readonly kind: 'blank' }
  | { readonly kind: 'winner'; readonly songId: string };

export interface SettleRoundParams {
  readonly round: RoundWindow;
  readonly votes: readonly SurvivingVote[];
  readonly now: Date;
}

interface SongStanding {
  readonly songId: string;
  readonly voteCount: number;
  readonly latestVoteAt: number;
}

export function selectRoundClosesAt(openedAt: Date): Date {
  return new Date(openedAt.getTime() + ROUND_DURATION_MS);
}

export function isRoundOpen(round: RoundWindow, now: Date): boolean {
  const isUnsettled = round.settledAt === null;
  const isBeforeClose = now.getTime() < round.closesAt.getTime();
  return isUnsettled && isBeforeClose;
}

export function remainingSeconds(round: RoundWindow, now: Date): number {
  const remainingMilliseconds = Math.max(
    NO_REMAINING_MILLISECONDS,
    round.closesAt.getTime() - now.getTime(),
  );
  return Math.ceil(remainingMilliseconds / MILLISECONDS_PER_SECOND);
}

function buildStandings(votes: readonly SurvivingVote[]): SongStanding[] {
  const standingBySongId = new Map<string, SongStanding>();
  for (const vote of votes) {
    const castAtMillis = vote.castAt.getTime();
    const known = standingBySongId.get(vote.songId);
    standingBySongId.set(vote.songId, {
      songId: vote.songId,
      voteCount: (known?.voteCount ?? 0) + 1,
      latestVoteAt: Math.max(known?.latestVoteAt ?? castAtMillis, castAtMillis),
    });
  }
  return [...standingBySongId.values()];
}

export interface SettlementWrite {
  readonly shouldClaimTheRound: boolean;
  readonly winningSongId: string | null;
}

const SETTLEMENT_WRITE_BY_KIND = {
  'still-open': { shouldClaimTheRound: false, winningSongId: null },
  'already-settled': { shouldClaimTheRound: false, winningSongId: null },
  blank: { shouldClaimTheRound: true, winningSongId: null },
} as const;

// @FollowsBlueprint core-decision
export function selectSettlementWrite(settlement: RoundSettlement): SettlementWrite {
  if (settlement.kind === 'winner') {
    return { shouldClaimTheRound: true, winningSongId: settlement.songId };
  }
  return SETTLEMENT_WRITE_BY_KIND[settlement.kind];
}

function compareByWinningOrder(left: SongStanding, right: SongStanding): number {
  const byVoteCount = right.voteCount - left.voteCount;
  if (byVoteCount !== 0) return byVoteCount;
  const byEarliestLatestVote = left.latestVoteAt - right.latestVoteAt;
  if (byEarliestLatestVote !== 0) return byEarliestLatestVote;
  return left.songId.localeCompare(right.songId);
}

// @FollowsBlueprint core-decision
export function settleRound(params: SettleRoundParams): RoundSettlement {
  const isAlreadySettled = params.round.settledAt !== null;
  if (isAlreadySettled) return { kind: 'already-settled' };
  const isStillOpen = params.now.getTime() < params.round.closesAt.getTime();
  if (isStillOpen) return { kind: 'still-open' };
  const standings = buildStandings(params.votes);
  const winner = [...standings].sort(compareByWinningOrder)[0];
  if (winner === undefined) return { kind: 'blank' };
  return { kind: 'winner', songId: winner.songId };
}

export interface ProjectableRound extends RoundWindow {
  readonly id: string;
  readonly openedAt: Date;
  readonly winningSongId: string | null;
}

export interface ProjectedRound {
  readonly id: string;
  readonly openedAt: string;
  readonly closesAt: string;
  readonly remainingSeconds: number;
  readonly isOpen: boolean;
  readonly isSettled: boolean;
  readonly winningSongId: string | null;
}

// @FollowsBlueprint core-projection
export function projectRound(round: ProjectableRound, now: Date): ProjectedRound {
  return {
    id: round.id,
    openedAt: round.openedAt.toISOString(),
    closesAt: round.closesAt.toISOString(),
    remainingSeconds: remainingSeconds(round, now),
    isOpen: isRoundOpen(round, now),
    isSettled: round.settledAt !== null,
    winningSongId: round.winningSongId,
  };
}

// @FollowsBlueprint core-projection
export function projectRoundHistory(
  rounds: readonly ProjectableRound[],
  titleBySongId: ReadonlyMap<string | null, string>,
  now: Date,
): (ProjectedRound & { readonly winningSongTitle: string | null })[] {
  return rounds.map((round) => ({
    ...projectRound(round, now),
    winningSongTitle: titleBySongId.get(round.winningSongId) ?? null,
  }));
}
