/** @Feature shell */

const TOP_OF_PAGE: ScrollToOptions = { top: 0, left: 0 };

/** @DependsOnExternal browser-scroll */
// @FollowsBlueprint browser-clipboard-write
export function scrollPageToTop(): void {
  window.scrollTo(TOP_OF_PAGE);
}
