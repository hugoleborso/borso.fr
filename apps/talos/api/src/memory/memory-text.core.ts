const COMBINING_MARKS_PATTERN = /\p{M}/gu;
const WHITESPACE_RUN_PATTERN = /\s+/g;
const LIKE_WILDCARDS_PATTERN = /[\\%_]/g;
const EXCERPT_RADIUS = 80;
const ELLIPSIS = '…';
const PATH_SEPARATOR = '/';

const MEMORY_SLUG_PREFIXES = [
  'second-brain/',
  'engagements/',
  'objectifs/',
  'sources/',
  'journal/',
  'etat/',
  'preferences/',
  'archives/',
  'inbox/',
  'modeles/',
  'taches/',
  'routines/',
] as const;
const MEMORY_ROOT_SLUGS: ReadonlySet<string> = new Set(['index', 'focus', 'todo', 'todo-taff']);

export function foldForSearch(text: string): string {
  return text.normalize('NFD').replace(COMBINING_MARKS_PATTERN, '').toLowerCase();
}

export function normalizeAliasValue(value: string): string {
  return foldForSearch(value).replace(WHITESPACE_RUN_PATTERN, ' ').trim();
}

export function buildContainsPattern(query: string): string {
  return `%${foldForSearch(query.trim()).replace(LIKE_WILDCARDS_PATTERN, (wildcard) => `\\${wildcard}`)}%`;
}

export function hasFoldedMatch(text: string | null, query: string): boolean {
  if (text === null) return false;
  return foldForSearch(text).includes(foldForSearch(query.trim()));
}

export function buildExcerpt(text: string, query: string): string {
  const position = foldForSearch(text).indexOf(foldForSearch(query.trim()));
  const start = Math.max(0, position - EXCERPT_RADIUS);
  const end = Math.min(text.length, Math.max(position, 0) + query.trim().length + EXCERPT_RADIUS);
  const prefix = start > 0 ? ELLIPSIS : '';
  const suffix = end < text.length ? ELLIPSIS : '';
  return `${prefix}${text.slice(start, end).replace(WHITESPACE_RUN_PATTERN, ' ').trim()}${suffix}`;
}

export function isMemorySlug(candidate: string): boolean {
  return (
    MEMORY_ROOT_SLUGS.has(candidate) ||
    MEMORY_SLUG_PREFIXES.some((prefix) => candidate.startsWith(prefix))
  );
}

export function isMissingMemoryTarget(slug: string, pageCount: number): boolean {
  return isMemorySlug(slug) && pageCount === 0;
}

export function readSlugTail(slug: string): string {
  return slug.slice(slug.lastIndexOf(PATH_SEPARATOR) + 1);
}

export function measureBytes(text: string): number {
  return new TextEncoder().encode(text).length;
}
