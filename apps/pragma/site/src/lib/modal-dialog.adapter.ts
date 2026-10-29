/**
 * @Blueprint ref-callback-browser-api
 * @BlueprintName Ref Callback Driving A Browser API
 * @BlueprintUsage Use for calling an imperative DOM method when React attaches a node, in place of a mount effect.
 * @BlueprintDescription Declares the callback at module level so React sees one identity and attaches the node once, and reaches the method through optional chaining so the detach call, which passes null, is a no-op needing no branch. A dialog is opened where it is rendered, with nothing watching an open prop.
 * @DependsOnExternal browser-dialog
 */

const FIRST_FIELD_SELECTOR =
  '[data-sheet-body] input:not([type=hidden]):not([type=checkbox]):not([type=radio]), [data-sheet-body] textarea, [data-sheet-body] select';
const CLOSE_BUTTON_SELECTOR = '[data-sheet-close]';
const CHOSEN_FOCUS_SELECTOR = '[data-sheet-focus]';

export function focusFirstField(dialog: HTMLDialogElement): void {
  const target =
    dialog.querySelector<HTMLElement>(CHOSEN_FOCUS_SELECTOR) ??
    dialog.querySelector<HTMLElement>(FIRST_FIELD_SELECTOR) ??
    dialog.querySelector<HTMLElement>(CLOSE_BUTTON_SELECTOR);
  target?.focus();
}

export function openDialogOnAttach(dialog: HTMLDialogElement | null): void {
  if (dialog === null) return;
  dialog.showModal();
  focusFirstField(dialog);
}

export function openDismissibleDialogOnAttach(dialog: HTMLDialogElement | null): void {
  if (dialog === null) return;
  dialog.showModal();
  focusFirstField(dialog);
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    dialog.close();
  });
}
