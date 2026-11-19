/**
 * @Blueprint ref-callback-browser-api
 * @BlueprintName Ref Callback Driving A Browser API
 * @BlueprintUsage Use for calling an imperative DOM method when React attaches a node, in place of a mount effect.
 * @BlueprintDescription Declares the callback at module level so React sees one identity and attaches the node once, and reaches the method through optional chaining so the call React makes with null is a no-op needing no branch. Its test makes that null call, or the mutation gate keeps the optional chain alive. A dialog is opened where it is rendered, with nothing watching an open prop, and the cleanup it returns closes it on detach, so a dialog removed by state still gives focus back to its opener.
 * @DependsOnExternal browser-dialog
 */

const FIRST_FIELD_SELECTOR =
  '[data-sheet-body] input:not([type=hidden]):not([type=checkbox]):not([type=radio]), [data-sheet-body] textarea, [data-sheet-body] select';
const CLOSE_BUTTON_SELECTOR = '[data-sheet-close]';
const CHOSEN_FOCUS_SELECTOR = '[data-sheet-focus]';
const FOCUS_WITHOUT_SCROLLING: FocusOptions = { preventScroll: true };

export function focusFirstField(dialog: HTMLElement | null): void {
  const target =
    dialog?.querySelector<HTMLElement>(CHOSEN_FOCUS_SELECTOR) ??
    dialog?.querySelector<HTMLElement>(FIRST_FIELD_SELECTOR) ??
    dialog?.querySelector<HTMLElement>(CLOSE_BUTTON_SELECTOR);
  target?.focus(FOCUS_WITHOUT_SCROLLING);
}

export function openDialogOnAttach(dialog: HTMLDialogElement | null): () => void {
  dialog?.showModal();
  focusFirstField(dialog);
  return () => dialog?.close();
}
