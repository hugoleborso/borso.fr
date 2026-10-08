import type { ParseKeys } from 'i18next';

export type CommitmentDirection = 'owed' | 'awaited';
export type CommitmentFilter = CommitmentDirection | 'all';

export const COMMITMENT_FILTERS: readonly CommitmentFilter[] = ['owed', 'awaited', 'all'];

const FILTER_LABEL_KEY: Readonly<Record<CommitmentFilter, ParseKeys>> = {
  owed: 'commitments.filter.owed',
  awaited: 'commitments.filter.awaited',
  all: 'commitments.filter.all',
};

// @FollowsBlueprint core-view-projection
export function readCommitmentFilter(raw: string | null): CommitmentFilter {
  return COMMITMENT_FILTERS.find((filter) => filter === raw) ?? 'all';
}

export function selectCommitmentFilterLabelKey(filter: CommitmentFilter): ParseKeys {
  return FILTER_LABEL_KEY[filter];
}

export function selectVisibleCommitments<
  Commitment extends { readonly direction: CommitmentDirection | null },
>(commitments: readonly Commitment[], filter: CommitmentFilter): Commitment[] {
  if (filter === 'all') return [...commitments];
  return commitments.filter((commitment) => commitment.direction === filter);
}

export function selectDirectionIcon(
  direction: CommitmentDirection | null,
): 'owed' | 'awaited' | 'commitment' {
  return direction ?? 'commitment';
}
