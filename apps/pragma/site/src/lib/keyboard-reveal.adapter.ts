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

const NEAREST_EDGE: ScrollIntoViewOptions = { block: 'nearest' };

export interface KeyboardHost {
  readonly visualViewport: EventTarget | null;
  readonly document: Pick<Document, 'activeElement'>;
  readonly requestAnimationFrame: (callback: () => void) => unknown;
}

/** @DependsOnExternal browser-scroll */
// @FollowsBlueprint injected-browser-api
export function keepFocusedFieldAboveKeyboard(host: KeyboardHost = window): void {
  const revealFocusedField = (): void => {
    const field = host.document.activeElement;
    const isTypedField = field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement;
    if (isTypedField) field.scrollIntoView(NEAREST_EDGE);
  };
  host.visualViewport?.addEventListener('resize', () => {
    host.requestAnimationFrame(revealFocusedField);
  });
}
