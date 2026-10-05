export interface SearchablePage {
  readonly path: string;
  readonly title: string;
  readonly body: string;
}

export interface SearchHit {
  readonly path: string;
  readonly title: string;
  readonly excerpt: string;
}

interface ScoredHit {
  readonly hit: SearchHit;
  readonly isTitleMatch: boolean;
  readonly isTitlePrefix: boolean;
  readonly segments: number;
}

const COMBINING_MARKS_PATTERN = /\p{M}/gu;
const WHITESPACE_PATTERN = /\s+/g;
const HEADING_OR_FRONT_MATTER_PATTERN = /^(#|---)/;
const EXCERPT_CONTEXT_LENGTH = 60;
const EXCERPT_FALLBACK_LENGTH = 120;
const ELLIPSIS = '…';

export function foldForSearch(text: string): string {
  return Array.from(text.toLowerCase())
    .map((character) => {
      const folded = character.normalize('NFD').replaceAll(COMBINING_MARKS_PATTERN, '');
      return folded.length === character.length ? folded : character;
    })
    .join('');
}

export function listSearchTerms(query: string): string[] {
  return foldForSearch(query).split(WHITESPACE_PATTERN).filter(Boolean);
}

function countSegmentsAround(haystack: string, term: string): number {
  return haystack.split(term).length;
}

function collapseWhitespace(text: string): string {
  return text.replaceAll(WHITESPACE_PATTERN, ' ').trim();
}

function buildExcerptAround(body: string, matchIndex: number, matchLength: number): string {
  const start = Math.max(0, matchIndex - EXCERPT_CONTEXT_LENGTH);
  const end = Math.min(body.length, matchIndex + matchLength + EXCERPT_CONTEXT_LENGTH);
  const prefix = start === 0 ? '' : ELLIPSIS;
  const suffix = end === body.length ? '' : ELLIPSIS;
  return `${prefix}${collapseWhitespace(body.slice(start, end))}${suffix}`;
}

function buildLeadExcerpt(body: string): string {
  const lead = body
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line !== '' && !HEADING_OR_FRONT_MATTER_PATTERN.test(line));
  const text = lead ?? '';
  return text.length > EXCERPT_FALLBACK_LENGTH
    ? `${text.slice(0, EXCERPT_FALLBACK_LENGTH)}${ELLIPSIS}`
    : text;
}

export function buildExcerpt(body: string, terms: readonly string[]): string {
  const foldedBody = foldForSearch(body);
  const firstTerm = terms.find((term) => foldedBody.includes(term));
  if (firstTerm === undefined) return buildLeadExcerpt(body);
  return buildExcerptAround(body, foldedBody.indexOf(firstTerm), firstTerm.length);
}

function scorePage(page: SearchablePage, terms: readonly string[]): ScoredHit | null {
  const foldedTitle = foldForSearch(page.title);
  const foldedBody = foldForSearch(page.body);
  const isTitleMatch = terms.every((term) => foldedTitle.includes(term));
  const isBodyMatch = terms.every((term) => foldedBody.includes(term));
  if (!isTitleMatch && !isBodyMatch) return null;
  return {
    hit: { path: page.path, title: page.title, excerpt: buildExcerpt(page.body, terms) },
    isTitleMatch,
    isTitlePrefix: isTitleMatch && terms.some((term) => foldedTitle.startsWith(term)),
    segments: terms.reduce((total, term) => total + countSegmentsAround(foldedBody, term), 0),
  };
}

function compareScoredHits(left: ScoredHit, right: ScoredHit): number {
  return (
    Number(right.isTitleMatch) - Number(left.isTitleMatch) ||
    Number(right.isTitlePrefix) - Number(left.isTitlePrefix) ||
    right.segments - left.segments ||
    left.hit.path.localeCompare(right.hit.path)
  );
}

// @FollowsBlueprint core-shared-ranking
export function rankSearchHits(
  pages: readonly SearchablePage[],
  query: string,
  limit: number,
): SearchHit[] {
  const terms = listSearchTerms(query);
  if (terms.length === 0) return [];
  return pages
    .map((page) => scorePage(page, terms))
    .filter((scored) => scored !== null)
    .toSorted(compareScoredHits)
    .slice(0, limit)
    .map((scored) => scored.hit);
}
