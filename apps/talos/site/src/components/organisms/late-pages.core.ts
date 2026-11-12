export interface RankedPage {
  readonly slug: string;
  readonly lateness: number;
}

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
