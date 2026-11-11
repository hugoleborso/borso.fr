export interface RankedPage {
  readonly slug: string;
  readonly lateness: number;
}

const TITLE_PREFIX = '# ';
const LINE_BREAK = '\n';

// @FollowsBlueprint core-view-projection
export function orderLatePages<Page extends RankedPage>(pages: readonly Page[]): Page[] {
  return [...pages].sort((left, right) => right.lateness - left.lateness);
}

export function selectLatePageCount(
  freshness: { readonly lateCount: number } | undefined,
): number | undefined {
  return freshness?.lateCount;
}

export function isPageLate(
  latePages: readonly { readonly slug: string }[] | undefined,
  path: string,
): boolean {
  return latePages?.some((page) => page.slug === path) ?? false;
}

export interface TitledMarkdown {
  readonly title: string;
  readonly rest: string;
}

export function splitTitleLine(markdown: string): TitledMarkdown {
  if (!markdown.startsWith(TITLE_PREFIX)) return { title: '', rest: markdown };
  const lineEnd = markdown.indexOf(LINE_BREAK);
  return lineEnd === -1
    ? { title: markdown, rest: '' }
    : { title: markdown.slice(0, lineEnd), rest: markdown.slice(lineEnd + 1) };
}
