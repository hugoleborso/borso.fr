/** @Feature songs */

const FIELD_AT_TOP: ScrollIntoViewOptions = { block: 'start' };
const ONE_RESIZE: AddEventListenerOptions = { once: true };

/** @DependsOnExternal browser-scroll */
// @FollowsBlueprint ref-callback-browser-api
export function focusFieldAboveKeyboard(field: HTMLElement | null): void {
  if (field === null) return;
  const revealField = (): void => field.scrollIntoView(FIELD_AT_TOP);
  field.addEventListener('focus', () => {
    window.visualViewport?.addEventListener('resize', revealField, ONE_RESIZE);
  });
  field.focus();
}
