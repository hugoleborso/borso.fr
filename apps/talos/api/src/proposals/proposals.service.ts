import { stripMarkdownExtension } from '@domain/markdown-page.core';
import {
  formatCancellationLine,
  formatDecisionLine,
  PENDING_PROPOSAL_STATUS,
  type Proposal,
  type ProposalDecision,
} from '@domain/proposal.core';
import {
  type FileEditor,
  listContentDirectory,
  readContentFiles,
} from '../content/content.service';
import { formatParisMinute } from '../helpers/calendar/paris-clock.utils';
import { TalosError } from '../helpers/errors/talos-error.types';
import { fireRoutine } from '../helpers/routine/routine-fire.adapter';
import { recordPwaChanges, renderMemoryProposal } from '../memory/memory-pwa.service';
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
const ROUTINE_TRIGGER = 'proposition';

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

interface ProposalEdit<Outcome> {
  readonly slug: string;
  readonly editor: FileEditor<Outcome>;
  readonly status: string;
  readonly decisionLine: string;
  readonly now: Date;
}

async function editProposal<Outcome>(edit: ProposalEdit<Outcome>): Promise<Outcome> {
  const memorySlug = stripMarkdownExtension(buildProposalPath(edit.slug));
  const fileEdit = edit.editor(await renderMemoryProposal(memorySlug));
  if (fileEdit.content === null) return fileEdit.outcome;
  await recordPwaChanges(
    fileEdit.commitMessage,
    [
      {
        op: 'proposal.status',
        slug: memorySlug,
        status: edit.status,
        decisionLine: edit.decisionLine,
      },
    ],
    edit.now,
  );
  return fileEdit.outcome;
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
  const record = {
    decision: params.decision,
    comment: params.comment,
    decidedAt: formatParisMinute(params.now),
  };
  const outcome = await editProposal({
    slug: params.slug,
    editor: (current) => decideProposalFile(params.slug, current, record),
    status: params.decision,
    decisionLine: formatDecisionLine(record),
    now: params.now,
  });
  const proposal = readDecidedProposal(outcome);
  await fireRoutine(ROUTINE_TRIGGER, stripMarkdownExtension(buildProposalPath(params.slug)));
  return proposal;
}

export async function cancelProposalDecision(params: {
  readonly slug: string;
  readonly now: Date;
}): Promise<Proposal> {
  const cancelledAt = formatParisMinute(params.now);
  const outcome = await editProposal({
    slug: params.slug,
    editor: (current) => cancelProposalDecisionFile(params.slug, current, cancelledAt),
    status: PENDING_PROPOSAL_STATUS,
    decisionLine: formatCancellationLine(cancelledAt),
    now: params.now,
  });
  return readReopenedProposal(outcome);
}
