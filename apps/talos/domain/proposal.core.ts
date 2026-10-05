import { z } from 'zod';
import { setFrontMatterValue, splitFrontMatter } from './front-matter.core';
import { readSection } from './markdown-page.core';

export const PROPOSAL_DECISIONS = ['acceptee', 'refusee'] as const;
export const PENDING_PROPOSAL_STATUS = 'proposee';

export type ProposalDecision = (typeof PROPOSAL_DECISIONS)[number];

export const proposalSchema = z.object({
  slug: z.string(),
  category: z.string(),
  status: z.string(),
  title: z.string(),
  priority: z.string(),
  createdOn: z.string(),
  expiresOn: z.string().optional(),
  why: z.string(),
  draft: z.string(),
  decisions: z.array(z.string()),
});

export type Proposal = z.infer<typeof proposalSchema>;

export interface DecisionRecord {
  readonly decision: ProposalDecision;
  readonly comment?: string | undefined;
  readonly decidedAt: string;
}

const PROPOSAL_TYPE = 'proposition';
const WHY_HEADING = 'Pourquoi';
const DRAFT_HEADING = 'Ce que Talos propose';
const DECISION_HEADING = 'Décision';
const DECISION_HEADING_LINE = `## ${DECISION_HEADING}`;
const LIST_ITEM_PREFIX = '- ';
const LINE_BREAK = '\n';
const LINE_BREAKS_PATTERN = /\s*[\r\n]+\s*/g;
const DECISION_LABELS: Readonly<Record<ProposalDecision, string>> = {
  acceptee: 'acceptée',
  refusee: 'refusée',
};

function listDecisions(section: string | null): string[] {
  // Stryker disable next-line StringLiteral: equivalent mutant, any fallback without a leading "- " is filtered out below exactly like the empty string.
  return (section ?? '')
    .split(LINE_BREAK)
    .filter((line) => line.startsWith(LIST_ITEM_PREFIX))
    .map((line) => line.slice(LIST_ITEM_PREFIX.length).trim());
}

// @FollowsBlueprint core-parse-untrusted
export function parseProposal(slug: string, markdown: string): Proposal | null {
  const { frontMatter, body } = splitFrontMatter(markdown);
  if (frontMatter.type !== PROPOSAL_TYPE) return null;
  const expiresOn = frontMatter.expire ?? '';
  return {
    slug,
    category: frontMatter.categorie ?? '',
    status: frontMatter.statut ?? '',
    title: frontMatter.titre ?? slug,
    priority: frontMatter.priorite ?? '',
    createdOn: frontMatter.cree ?? '',
    ...(expiresOn === '' ? {} : { expiresOn }),
    why: readSection(body, WHY_HEADING) ?? '',
    draft: readSection(body, DRAFT_HEADING) ?? '',
    decisions: listDecisions(readSection(body, DECISION_HEADING)),
  };
}

export function isProposalPending(proposal: Proposal, today: string): boolean {
  const isActive = proposal.expiresOn === undefined || proposal.expiresOn >= today;
  return proposal.status === PENDING_PROPOSAL_STATUS && isActive;
}

export function sortProposalsNewestFirst(proposals: readonly Proposal[]): Proposal[] {
  return proposals.toSorted(
    (left, right) =>
      right.createdOn.localeCompare(left.createdOn) || right.slug.localeCompare(left.slug),
  );
}

function formatDecisionLine(record: DecisionRecord): string {
  const comment = (record.comment ?? '').replaceAll(LINE_BREAKS_PATTERN, ' ').trim();
  const suffix = comment === '' ? '' : ` — ${comment}`;
  return `${LIST_ITEM_PREFIX}${record.decidedAt} : ${DECISION_LABELS[record.decision]}${suffix}`;
}

function findSectionEnd(lines: readonly string[], headingIndex: number): number {
  const nextHeadingOffset = lines.slice(headingIndex + 1).findIndex((line) => line.startsWith('#'));
  return nextHeadingOffset === -1 ? lines.length : headingIndex + 1 + nextHeadingOffset;
}

function lastContentIndexBefore(lines: readonly string[], start: number, end: number): number {
  const contentOffset = lines.slice(start, end).findLastIndex((line) => line.trim() !== '');
  return start + contentOffset;
}

function insertDecisionLine(markdown: string, decisionLine: string): string {
  const lines = markdown.replace(/\n+$/, '').split(LINE_BREAK);
  const headingIndex = lines.findIndex((line) => line.trimEnd() === DECISION_HEADING_LINE);
  if (headingIndex === -1) {
    return [...lines, '', DECISION_HEADING_LINE, decisionLine, ''].join(LINE_BREAK);
  }
  const insertAfter = lastContentIndexBefore(
    lines,
    headingIndex,
    findSectionEnd(lines, headingIndex),
  );
  return [
    ...lines.slice(0, insertAfter + 1),
    decisionLine,
    ...lines.slice(insertAfter + 1),
    '',
  ].join(LINE_BREAK);
}

// @FollowsBlueprint core-serializer
export function applyProposalDecision(markdown: string, record: DecisionRecord): string {
  const withStatus = setFrontMatterValue(markdown, 'statut', record.decision);
  return insertDecisionLine(withStatus, formatDecisionLine(record));
}
