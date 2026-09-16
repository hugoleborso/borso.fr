export type VoteIntent = 'cast' | 'withdraw';

export interface VotableImprovement {
  readonly voteCount: number;
  readonly votedByViewer: boolean;
}

export function selectVoteIntent(hasViewerVoted: boolean): VoteIntent {
  return hasViewerVoted ? 'withdraw' : 'cast';
}

// @FollowsBlueprint utils-pure-module
export function applyVoteIntent<TImprovement extends VotableImprovement>(
  improvement: TImprovement,
  intent: VoteIntent,
): TImprovement {
  const isVoted = intent === 'cast';
  if (improvement.votedByViewer === isVoted) return improvement;
  return {
    ...improvement,
    votedByViewer: isVoted,
    voteCount: improvement.voteCount + (isVoted ? 1 : -1),
  };
}
