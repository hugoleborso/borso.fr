import {
  matchReference,
  type ReferenceCandidate,
  type ReferenceMatch,
} from '../helpers/reference/reference.core';
import type { ToolRefusal } from './mcp.types';

export const LISTED_CANDIDATES_MAX = 10;
const INVALID_INPUT_ERROR = 'invalid-input';
const WHOLE_INPUT_FIELD = 'input';
const FIELD_PATH_SEPARATOR = '.';

export interface FieldIssue {
  readonly path: readonly (string | number)[];
  readonly message: string;
}

export type UnresolvedReference = Exclude<ReferenceMatch, { kind: 'found' }>;

export class ToolRefusedError extends Error {
  override readonly name = 'ToolRefusedError';

  constructor(readonly body: ToolRefusal) {
    super(body.error);
  }
}

export function readToolRefusal(error: unknown): ToolRefusal | null {
  return error instanceof ToolRefusedError ? error.body : null;
}

function listCandidates(candidates: readonly ReferenceCandidate[]) {
  const listed = candidates.slice(0, LISTED_CANDIDATES_MAX);
  const unlisted = candidates.length - listed.length;
  return unlisted > 0 ? { candidates: listed, more: unlisted } : { candidates: listed };
}

// @FollowsBlueprint core-decision
export function describeUnresolvedReference(
  noun: string,
  reference: string,
  match: UnresolvedReference,
): ToolRefusal {
  if (match.kind === 'missing') return { error: `${noun}-not-found`, reference };
  return { error: `${noun}-ambiguous`, reference, ...listCandidates(match.candidates) };
}

export function pickReference(
  noun: string,
  candidates: readonly ReferenceCandidate[],
  reference: string,
): string {
  const match = matchReference(candidates, reference);
  if (match.kind === 'found') return match.id;
  throw new ToolRefusedError(describeUnresolvedReference(noun, reference, match));
}

// @FollowsBlueprint core-projection
export function describeInvalidFields(issues: readonly FieldIssue[]): ToolRefusal {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const field = issue.path.join(FIELD_PATH_SEPARATOR) || WHOLE_INPUT_FIELD;
    fields[field] ??= issue.message;
  }
  return { error: INVALID_INPUT_ERROR, fields };
}
