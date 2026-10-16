import { isProposalExpired, isProposalPending, type ProposalDecision } from '@domain/proposal.core';
import type { ParseKeys } from 'i18next';
import type { ChipTone } from '../atoms/chip.variants';
import type { IconName } from '../atoms/Icon';

export interface ProposalShape {
  readonly slug: string;
  readonly status: string;
  readonly priority: string;
  readonly category: string;
  readonly createdOn: string;
  readonly expiresOn?: string;
}

const PRIORITY_RANK: Readonly<Record<string, number>> = { haute: 0, normale: 1, basse: 2 };
const UNKNOWN_PRIORITY_RANK = 1;

function rankPriority(priority: string): number {
  return PRIORITY_RANK[priority] ?? UNKNOWN_PRIORITY_RANK;
}

function compareNewestFirst(left: ProposalShape, right: ProposalShape): number {
  return right.createdOn.localeCompare(left.createdOn);
}

function comparePending(left: ProposalShape, right: ProposalShape): number {
  return (
    rankPriority(left.priority) - rankPriority(right.priority) || compareNewestFirst(left, right)
  );
}

// @FollowsBlueprint core-view-projection
export function partitionProposals<Proposal extends ProposalShape>(
  proposals: readonly Proposal[],
  today: string,
): { pending: Proposal[]; expired: Proposal[]; decided: Proposal[] } {
  const isPending = (proposal: Proposal): boolean => isProposalPending(proposal, today);
  const isExpired = (proposal: Proposal): boolean => isProposalExpired(proposal, today);
  return {
    pending: proposals.filter(isPending).toSorted(comparePending),
    expired: proposals.filter(isExpired).toSorted(compareNewestFirst),
    decided: proposals
      .filter((proposal) => !isPending(proposal) && !isExpired(proposal))
      .toSorted(compareNewestFirst),
  };
}

const PRIORITY_TONE: Readonly<Record<string, ChipTone>> = {
  haute: 'bronze',
  normale: 'neutral',
  basse: 'outline',
};

export function selectPriorityTone(priority: string): ChipTone {
  return PRIORITY_TONE[priority] ?? 'neutral';
}

const PRIORITY_LABEL_KEY: Readonly<Record<string, ParseKeys>> = {
  haute: 'proposals.priority.high',
  normale: 'proposals.priority.normal',
  basse: 'proposals.priority.low',
};

export function selectPriorityLabelKey(priority: string): ParseKeys {
  return PRIORITY_LABEL_KEY[priority] ?? 'proposals.priority.normal';
}

const CATEGORY_LABEL_KEY: Readonly<Record<string, ParseKeys>> = {
  action: 'proposals.category.action',
  initiative: 'proposals.category.initiative',
  idee: 'proposals.category.idea',
  logistique: 'proposals.category.logistics',
  construction: 'proposals.category.build',
};

export function selectCategoryLabelKey(category: string): ParseKeys {
  return CATEGORY_LABEL_KEY[category] ?? 'proposals.category.other';
}

const STATUS_LABEL_KEY: Readonly<Record<string, ParseKeys>> = {
  proposee: 'proposals.status.pending',
  acceptee: 'proposals.status.accepted',
  refusee: 'proposals.status.refused',
  faite: 'proposals.status.completed',
  expiree: 'proposals.status.expired',
};

export function selectStatusLabelKey(status: string): ParseKeys {
  return STATUS_LABEL_KEY[status] ?? 'proposals.status.pending';
}

const STATUS_TONE: Readonly<Record<string, ChipTone>> = {
  acceptee: 'success',
  faite: 'success',
  refusee: 'neutral',
  expiree: 'outline',
};

export function selectStatusTone(status: string): ChipTone {
  return STATUS_TONE[status] ?? 'bronze';
}

export function buildDecisionPayload(
  decision: ProposalDecision,
  comment: string,
): { decision: ProposalDecision; comment?: string } {
  const trimmed = comment.trim();
  return trimmed.length > 0 ? { decision, comment: trimmed } : { decision };
}

export const PROPOSAL_SHEET_ACTION: Readonly<
  Record<ProposalDecision, { readonly labelKey: ParseKeys; readonly icon: IconName }>
> = {
  acceptee: { labelKey: 'proposals.accept', icon: 'check' },
  refusee: { labelKey: 'proposals.refuse', icon: 'close' },
};
