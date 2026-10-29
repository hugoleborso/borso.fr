export interface TalliedImprovement {
  readonly id: string;
  readonly title: string;
  readonly details: string;
  readonly status: string;
  readonly voteCount: number;
  readonly votedByViewer: boolean;
}

export interface ImprovementToolView {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly votes: number;
  readonly mine: boolean;
  readonly details: string;
}

// @FollowsBlueprint core-projection
export function projectImprovementForTool(improvement: TalliedImprovement): ImprovementToolView {
  return {
    id: improvement.id,
    title: improvement.title,
    status: improvement.status,
    votes: improvement.voteCount,
    mine: improvement.votedByViewer,
    details: improvement.details,
  };
}
