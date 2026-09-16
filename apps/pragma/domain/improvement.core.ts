export const IMPROVEMENT_STATUSES = ['idea', 'planned', 'building', 'shipped', 'declined'] as const;

export type ImprovementStatus = (typeof IMPROVEMENT_STATUSES)[number];

export const DEFAULT_IMPROVEMENT_STATUS: ImprovementStatus = 'idea';

// @FollowsBlueprint core-lookup-table
const STATUS_RANK = {
  idea: 0,
  planned: 1,
  building: 2,
  shipped: 3,
  declined: 4,
} as const satisfies Record<ImprovementStatus, number>;

const UNKNOWN_STATUS_RANK = IMPROVEMENT_STATUSES.length;

export function isImprovementStatus(candidate: string): candidate is ImprovementStatus {
  return IMPROVEMENT_STATUSES.some((status) => status === candidate);
}

export function resolveImprovementStatus(candidate: string): ImprovementStatus {
  return isImprovementStatus(candidate) ? candidate : DEFAULT_IMPROVEMENT_STATUS;
}

export function selectStatusRank(status: string): number {
  return isImprovementStatus(status) ? STATUS_RANK[status] : UNKNOWN_STATUS_RANK;
}

export interface BacklogRankable {
  readonly status: string;
  readonly voteCount: number;
  readonly createdAt: string | Date;
}

function readTimestamp(createdAt: string | Date): number {
  return createdAt instanceof Date ? createdAt.getTime() : Date.parse(createdAt);
}

/**
 * @Blueprint core-shared-ranking
 * @BlueprintName Shared Ranking Rule
 * @BlueprintUsage Use for an order both sides of the application have to produce, so an optimistic write and a fresh read cannot disagree about where a row sits.
 * @BlueprintDescription Lives in `domain/` rather than in either slice, because the back end sorts what it serves and the front end re-sorts its cache after every optimistic write; two copies of the comparator would drift and the drift shows only as a row that refuses to move until a reload. It takes `createdAt` as a `Date` or as the string a JSON response carries, since that is the one field whose type differs across the boundary, and it answers a new array so a cached list is never sorted in place.
 */
export function rankImprovements<TImprovement extends BacklogRankable>(
  improvements: readonly TImprovement[],
): TImprovement[] {
  return improvements.toSorted((left, right) => {
    const byStatus = selectStatusRank(left.status) - selectStatusRank(right.status);
    if (byStatus !== 0) return byStatus;
    const byVotes = right.voteCount - left.voteCount;
    if (byVotes !== 0) return byVotes;
    return readTimestamp(left.createdAt) - readTimestamp(right.createdAt);
  });
}
