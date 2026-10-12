import type { Proposal, ProposalDecision } from '@domain/proposal.core';
import {
  editContentFile,
  listContentDirectory,
  readContentFiles,
} from '../content/content.service';
import { formatParisMinute } from '../helpers/calendar/paris-clock.utils';
import { TalosError } from '../helpers/errors/talos-error.types';
import { fireRoutine } from '../helpers/routine/routine-fire.adapter';
import {
  buildProposalPath,
  type CancellationOutcome,
  cancelProposalDecisionFile,
  type DecisionOutcome,
  decideProposalFile,
  isProposalFile,
  selectProposals,
} from './proposals.core';

const PROPOSALS_DIRECTORY = 'etat/propositions';

function readDecidedProposal(outcome: DecisionOutcome): Proposal {
  if (outcome.kind === 'not-found') throw new TalosError('proposal-not-found');
  if (outcome.kind === 'already-decided') throw new TalosError('proposal-already-decided');
  return outcome.proposal;
}

function readReopenedProposal(outcome: CancellationOutcome): Proposal {
  if (outcome.kind === 'not-found') throw new TalosError('proposal-not-found');
  if (outcome.kind === 'not-revocable') throw new TalosError('proposal-not-revocable');
  return outcome.proposal;
}

// @FollowsBlueprint service-orchestration
export async function listProposals(status: string | undefined): Promise<Proposal[]> {
  const files = (await listContentDirectory(PROPOSALS_DIRECTORY)).filter(isProposalFile);
  return selectProposals(await readContentFiles(files), status);
}

export async function decideProposal(params: {
  readonly slug: string;
  readonly decision: ProposalDecision;
  readonly comment?: string | undefined;
  readonly now: Date;
}): Promise<Proposal> {
  const path = buildProposalPath(params.slug);
  const record = {
    decision: params.decision,
    comment: params.comment,
    decidedAt: formatParisMinute(params.now),
  };
  const outcome = await editContentFile(path, (current) =>
    decideProposalFile(params.slug, current, record),
  );
  const proposal = readDecidedProposal(outcome);
  await fireRoutine('proposition', path);
  return proposal;
}

export async function cancelProposalDecision(params: {
  readonly slug: string;
  readonly now: Date;
}): Promise<Proposal> {
  const cancelledAt = formatParisMinute(params.now);
  const outcome = await editContentFile(buildProposalPath(params.slug), (current) =>
    cancelProposalDecisionFile(params.slug, current, cancelledAt),
  );
  return readReopenedProposal(outcome);
}
