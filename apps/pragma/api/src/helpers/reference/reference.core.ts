export interface ReferenceCandidate {
  readonly id: string;
  readonly label: string;
  readonly hint?: string;
}

export type ReferenceMatch =
  | { readonly kind: 'found'; readonly id: string }
  | { readonly kind: 'ambiguous'; readonly candidates: readonly ReferenceCandidate[] }
  | { readonly kind: 'missing' };

const IDENTIFIER_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DIACRITIC_PATTERN = /\p{Diacritic}/gu;
const SPACE_RUN_PATTERN = /\s+/g;
const MISSING: ReferenceMatch = { kind: 'missing' };

export function isIdentifierReference(reference: string): boolean {
  return IDENTIFIER_PATTERN.test(reference);
}

export function foldReferenceText(text: string): string {
  return text
    .normalize('NFD')
    .replace(DIACRITIC_PATTERN, '')
    .toLowerCase()
    .replace(SPACE_RUN_PATTERN, ' ')
    .trim();
}

function settleMatches(matches: readonly ReferenceCandidate[]): ReferenceMatch | null {
  const [only, ...others] = matches;
  if (only === undefined) return null;
  if (others.length === 0) return { kind: 'found', id: only.id };
  return { kind: 'ambiguous', candidates: matches };
}

// @FollowsBlueprint helper-module
export function matchReference(
  candidates: readonly ReferenceCandidate[],
  reference: string,
): ReferenceMatch {
  const byIdentifier = candidates.find((candidate) => candidate.id === reference);
  if (byIdentifier !== undefined) return { kind: 'found', id: byIdentifier.id };
  const folded = foldReferenceText(reference);
  if (folded === '') return MISSING;
  const exact = candidates.filter((candidate) => foldReferenceText(candidate.label) === folded);
  const partial = candidates.filter((candidate) =>
    foldReferenceText(candidate.label).includes(folded),
  );
  return settleMatches(exact) ?? settleMatches(partial) ?? MISSING;
}
