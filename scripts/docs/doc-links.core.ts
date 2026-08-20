const LINK_PATTERN = /\]\(([^)\s]+?)(?:#[^)\s]*)?\)/g;

const FENCE_PATTERN = /^\s*(?:```|~~~)/;

function buildFencedLineNumbers(markdown: string): ReadonlySet<number> {
  const fenced = new Set<number>();
  let isInFence = false;
  markdown.split('\n').forEach((line, index) => {
    if (FENCE_PATTERN.test(line)) isInFence = !isInFence;
    if (isInFence) fenced.add(index + 1);
  });
  return fenced;
}

const ABSOLUTE_SCHEMES = ['http://', 'https://', 'mailto:', 'ftp://'];

const PLACEHOLDER_PATTERN = /[{}<>…]|NNNN/;

const GITHUB_RELATIVE_PATTERN =
  /(?:^|\/)(?:commit|commits|pull|issues|compare|releases|tree|blob)\//;

function isProse(target: string): boolean {
  return !target.includes('/') && !target.includes('.');
}

export type SkipReason = 'absolute' | 'anchor' | 'placeholder' | 'github-relative' | 'not-a-path';

export interface DocumentLink {
  readonly target: string;
  readonly line: number;
}

export function listLinks(markdown: string): readonly DocumentLink[] {
  const fenced = buildFencedLineNumbers(markdown);
  const links: DocumentLink[] = [];
  let line = 1;
  let consumed = 0;
  markdown.replace(LINK_PATTERN, (whole: string, target: string, offset: number) => {
    line += countNewlines(markdown.slice(consumed, offset));
    consumed = offset;
    if (!fenced.has(line)) links.push({ target, line });
    return whole;
  });
  return links;
}

function countNewlines(text: string): number {
  return text.split('\n').length - 1;
}

export function readSkipReason(target: string): SkipReason | null {
  if (ABSOLUTE_SCHEMES.some((scheme) => target.startsWith(scheme))) return 'absolute';
  if (target.startsWith('#')) return 'anchor';
  if (PLACEHOLDER_PATTERN.test(target)) return 'placeholder';
  if (GITHUB_RELATIVE_PATTERN.test(target)) return 'github-relative';
  if (isProse(target)) return 'not-a-path';
  return null;
}

export interface BrokenLink {
  readonly document: string;
  readonly line: number;
  readonly target: string;
}

export interface DocumentUnderCheck {
  readonly path: string;
  readonly markdown: string;
}

export function listBrokenLinks(
  document: DocumentUnderCheck,
  isPresent: (documentPath: string, target: string) => boolean,
): readonly BrokenLink[] {
  const broken: BrokenLink[] = [];
  for (const link of listLinks(document.markdown)) {
    if (readSkipReason(link.target) !== null) continue;
    if (isPresent(document.path, link.target)) continue;
    broken.push({ document: document.path, line: link.line, target: link.target });
  }
  return broken;
}
