import {
  applyDecisionCancellation,
  applyProposalDecision,
  type DecisionRecord,
  isDecisionRevocable,
  parseProposal,
  PENDING_PROPOSAL_STATUS,
  type Proposal,
  sortProposalsNewestFirst,
} from '@domain/proposal.core';
import type { FileEdit } from '../content/content.service';

export type DecisionOutcome =
  | { readonly kind: 'decided'; readonly proposal: Proposal }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'already-decided' };

export type CancellationOutcome =
  | { readonly kind: 'cancelled'; readonly proposal: Proposal }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'not-revocable' };

const PROPOSALS_DIRECTORY = 'etat/propositions';
const MARKDOWN_EXTENSION = '.md';
const DECISION_VERBS = { acceptee: 'acceptée', refusee: 'refusée' } as const;

export function buildProposalPath(slug: string): string {
  return `${PROPOSALS_DIRECTORY}/${slug}${MARKDOWN_EXTENSION}`;
}

export function readProposalSlug(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1, -MARKDOWN_EXTENSION.length);
}

export function isProposalFile(path: string): boolean {
  return path.endsWith(MARKDOWN_EXTENSION);
}

// @FollowsBlueprint core-projection
export function selectProposals(
  files: ReadonlyMap<string, string>,
  status: string | undefined,
): Proposal[] {
  const proposals = [...files]
    .map(([path, markdown]) => parseProposal(readProposalSlug(path), markdown))
    .filter((proposal) => proposal !== null)
    .filter((proposal) => status === undefined || proposal.status === status);
  return sortProposalsNewestFirst(proposals);
}

export function decideProposalFile(
  slug: string,
  current: string | null,
  record: DecisionRecord,
): FileEdit<DecisionOutcome> {
  if (current === null) return { content: null, outcome: { kind: 'not-found' } };
  const proposal = parseProposal(slug, current);
  if (proposal === null) return { content: null, outcome: { kind: 'not-found' } };
  if (proposal.status !== PENDING_PROPOSAL_STATUS) {
    return { content: null, outcome: { kind: 'already-decided' } };
  }
  const content = applyProposalDecision(current, record);
  return {
    content,
    commitMessage: `pwa : proposition ${DECISION_VERBS[record.decision]} ${slug}`,
    outcome: { kind: 'decided', proposal: { ...proposal, ...parseProposal(slug, content) } },
  };
}

export function cancelProposalDecisionFile(
  slug: string,
  current: string | null,
  cancelledAt: string,
): FileEdit<CancellationOutcome> {
  if (current === null) return { content: null, outcome: { kind: 'not-found' } };
  const proposal = parseProposal(slug, current);
  if (proposal === null) return { content: null, outcome: { kind: 'not-found' } };
  if (!isDecisionRevocable(proposal.status)) {
    return { content: null, outcome: { kind: 'not-revocable' } };
  }
  const content = applyDecisionCancellation(current, cancelledAt);
  return {
    content,
    commitMessage: `pwa : décision annulée ${slug}`,
    outcome: { kind: 'cancelled', proposal: { ...proposal, ...parseProposal(slug, content) } },
  };
}
