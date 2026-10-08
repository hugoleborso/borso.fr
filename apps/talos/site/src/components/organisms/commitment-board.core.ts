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

export type CommitmentVariant = 'task' | 'awaited';

export interface DescribableCommitment {
  readonly direction: CommitmentDirection | null;
  readonly title: string;
  readonly action?: string;
  readonly counterpart?: string;
  readonly counterpartName?: string;
}

export interface CommitmentHeadline {
  readonly variant: CommitmentVariant;
  readonly lead: string | null;
  readonly text: string;
}

const WORD_SEPARATOR_PATTERN = /\s+/;

function selectFirstName(fullName: string | undefined): string | null {
  const firstName = fullName?.trim().split(WORD_SEPARATOR_PATTERN)[0];
  return firstName === undefined || firstName === '' ? null : firstName;
}

export function selectCommitmentHeadline(
  commitment: DescribableCommitment,
  nameOfPage: (pagePath: string) => string,
): CommitmentHeadline {
  if (commitment.direction !== 'awaited') {
    return { variant: 'task', lead: null, text: commitment.title };
  }
  const fullName =
    commitment.counterpart === undefined
      ? commitment.counterpartName
      : nameOfPage(commitment.counterpart);
  return {
    variant: 'awaited',
    lead: selectFirstName(fullName),
    text: commitment.action ?? commitment.title,
  };
}
