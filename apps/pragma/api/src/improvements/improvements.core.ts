export interface ImprovementVoteRecord {
  readonly improvementId: string;
  readonly memberId: string;
}

export interface ImprovementTally {
  readonly voteCount: number;
  readonly votedByViewer: boolean;
}

const EMPTY_TALLY: ImprovementTally = { voteCount: 0, votedByViewer: false };

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
