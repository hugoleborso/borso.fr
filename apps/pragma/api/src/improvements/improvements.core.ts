import type { ImprovementStatus } from './improvements.schema';

export interface ImprovementVoteRecord {
  readonly improvementId: string;
  readonly memberId: string;
}

export interface ImprovementTally {
  readonly voteCount: number;
  readonly votedByViewer: boolean;
}

export interface RankableImprovement {
  readonly id: string;
  readonly status: ImprovementStatus;
  readonly createdAt: Date;
  readonly voteCount: number;
}

const EMPTY_TALLY: ImprovementTally = { voteCount: 0, votedByViewer: false };

// @FollowsBlueprint core-lookup-table
const STATUS_RANK = {
  idea: 0,
  planned: 1,
  building: 2,
  shipped: 3,
  declined: 4,
} as const satisfies Record<ImprovementStatus, number>;

export function readTally(
  tallies: ReadonlyMap<string, ImprovementTally>,
  improvementId: string,
): ImprovementTally {
  return tallies.get(improvementId) ?? EMPTY_TALLY;
}

// @FollowsBlueprint core-decision
export function summariseVotes(
  votes: readonly ImprovementVoteRecord[],
  viewerMemberId: string,
): ReadonlyMap<string, ImprovementTally> {
  const tallies = new Map<string, ImprovementTally>();
  for (const vote of votes) {
    const current = tallies.get(vote.improvementId) ?? EMPTY_TALLY;
    tallies.set(vote.improvementId, {
      voteCount: current.voteCount + 1,
      votedByViewer: current.votedByViewer || vote.memberId === viewerMemberId,
    });
  }
  return tallies;
}

// @FollowsBlueprint core-decision
export function rankImprovements<TImprovement extends RankableImprovement>(
  improvements: readonly TImprovement[],
): TImprovement[] {
  return improvements.toSorted((left, right) => {
    const byStatus = STATUS_RANK[left.status] - STATUS_RANK[right.status];
    if (byStatus !== 0) return byStatus;
    const byVotes = right.voteCount - left.voteCount;
    if (byVotes !== 0) return byVotes;
    return left.createdAt.getTime() - right.createdAt.getTime();
  });
}
