import { splitFrontMatter } from '@domain/front-matter.core';
import { listWikilinkTargets, readPageTitle } from '@domain/markdown-page.core';

export type CommitmentDirection = 'owed' | 'awaited';

export interface Commitment {
  readonly path: string;
  readonly title: string;
  readonly direction: CommitmentDirection | null;
  readonly counterpart?: string;
  readonly dueDate?: string;
}

export interface CommitmentCounts {
  readonly owed: number;
  readonly awaited: number;
}

const MARKDOWN_EXTENSION = '.md';
const COMMITMENT_TYPE = 'engagement';
const OPEN_STATUS = 'ouvert';
const LAST_DAY = '9999-12-31';
const ISO_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}/;
const DIRECTION_BY_ARROW: Readonly<Record<string, CommitmentDirection>> = {
  'moi->eux': 'owed',
  'eux->moi': 'awaited',
};

function readDueDate(rawDueDate: string | undefined): string | undefined {
  // Stryker disable next-line StringLiteral: equivalent mutant, any fallback that does not start with a date is read as no due date exactly like the empty string.
  return ISO_DAY_PATTERN.exec(rawDueDate ?? '')?.[0];
}

export function isCommitmentFile(path: string): boolean {
  return path.endsWith(MARKDOWN_EXTENSION);
}

// @FollowsBlueprint core-parse-untrusted
export function parseOpenCommitment(file: string, markdown: string): Commitment | null {
  const { frontMatter, body } = splitFrontMatter(markdown);
  if (frontMatter.type !== COMMITMENT_TYPE || frontMatter.statut !== OPEN_STATUS) return null;
  const path = file.slice(0, -MARKDOWN_EXTENSION.length);
  // Stryker disable next-line StringLiteral: equivalent mutant, any fallback without a wikilink yields no counterpart exactly like the empty string.
  const counterpart = listWikilinkTargets(frontMatter.qui ?? '')[0];
  const dueDate = readDueDate(frontMatter.echeance);
  return {
    path,
    title: readPageTitle(body, frontMatter.quoi ?? path),
    // Stryker disable next-line StringLiteral: equivalent mutant, any fallback that is not an arrow of the table reads as no direction exactly like the empty string.
    direction: DIRECTION_BY_ARROW[frontMatter.sens ?? ''] ?? null,
    ...(counterpart === undefined ? {} : { counterpart }),
    ...(dueDate === undefined ? {} : { dueDate }),
  };
}

function compareByDueDate(left: Commitment, right: Commitment): number {
  const byDueDate = (left.dueDate ?? LAST_DAY).localeCompare(right.dueDate ?? LAST_DAY);
  return byDueDate === 0 ? left.path.localeCompare(right.path) : byDueDate;
}

// @FollowsBlueprint core-projection
export function selectOpenCommitments(files: ReadonlyMap<string, string>): Commitment[] {
  return [...files]
    .map(([file, markdown]) => parseOpenCommitment(file, markdown))
    .filter((commitment) => commitment !== null)
    .toSorted(compareByDueDate);
}

export function selectCommitmentsDueBy(
  commitments: readonly Commitment[],
  horizon: string,
): Commitment[] {
  return commitments.filter((commitment) => (commitment.dueDate ?? LAST_DAY) <= horizon);
}

export function countCommitments(commitments: readonly Commitment[]): CommitmentCounts {
  return {
    owed: commitments.filter((commitment) => commitment.direction === 'owed').length,
    awaited: commitments.filter((commitment) => commitment.direction === 'awaited').length,
  };
}
