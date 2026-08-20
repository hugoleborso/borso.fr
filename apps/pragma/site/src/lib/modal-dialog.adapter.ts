/**
 * @Blueprint ref-callback-browser-api
 * @BlueprintName Ref Callback Driving A Browser API
 * @BlueprintUsage Use for calling an imperative DOM method when React attaches a node, in place of a mount effect.
 * @BlueprintDescription Declares the callback at module level so React sees one identity and attaches the node once, and reaches the method through optional chaining so the detach call, which passes null, is a no-op needing no branch. A dialog is opened where it is rendered, with nothing watching an open prop.
 * @DependsOnExternal browser-dialog
 */

export function openDialogOnAttach(dialog: HTMLDialogElement | null): void {
  dialog?.showModal();
}

export function openDismissibleDialogOnAttach(dialog: HTMLDialogElement | null): void {
  if (dialog === null) return;
  dialog.showModal();
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    dialog.close();
  });
}
