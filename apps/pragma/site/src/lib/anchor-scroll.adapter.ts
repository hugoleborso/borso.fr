/** @Feature auth */

const ADDRESSED_SECTION_VIEW: ScrollIntoViewOptions = { block: 'start' };

/** @DependsOnExternal browser-scroll */
// @FollowsBlueprint ref-callback-browser-api
export function scrollIntoViewWhenAddressed(element: HTMLElement | null): void {
  if (element === null || window.location.hash !== `#${element.id}`) return;
  element.scrollIntoView(ADDRESSED_SECTION_VIEW);
}
