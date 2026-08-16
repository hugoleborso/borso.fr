/**
 * Ref callbacks that open a native `<dialog>` as a modal the moment
 * React attaches it, and do nothing when React detaches it.
 *
 * They are module-level functions rather than inline arrows, so React
 * sees the same identity on every render and attaches the node once. A
 * dialog is therefore opened where it is rendered, with no effect
 * watching an `open` prop. Render the dialog only while it should be
 * open, and let `onClose` tell the parent when the user dismisses it.
 *
 * @Blueprint ref-callback-browser-api
 * @BlueprintName Ref Callback Driving A Browser API
 * @BlueprintUsage Use for calling an imperative DOM method when React attaches a node, in place of a mount effect.
 * @BlueprintDescription Declares the callback at module level so React sees one identity and attaches the node once, and reaches the method through optional chaining so the detach call, which passes null, is a no-op needing no branch. A dialog is opened where it is rendered, with nothing watching an open prop.
 *
 * @DependsOnExternal browser-dialog
 */

export function openDialogOnAttach(dialog: HTMLDialogElement | null): void {
  dialog?.showModal();
}

/**
 * Opens the dialog, and additionally dismisses it when the reader taps beside
 * the sheet. Tapping outside is the gesture a phone user tries first and the
 * browser wires up neither it nor anything else on the backdrop; only Escape
 * comes for free.
 *
 * The backdrop belongs to the dialog element itself, so a click beside the
 * content still targets the dialog, and the identity test is what separates
 * the two. That makes this correct only for a dialog carrying no padding of
 * its own — otherwise its own padding reads as backdrop. It is opt-in for the
 * same reason the stage view must not have it: there, a tap on the margin
 * would close the chart the band is playing from.
 *
 * The listener needs no removal: the node it is bound to is the one React
 * discards when the parent stops rendering the dialog.
 */
export function openDismissibleDialogOnAttach(dialog: HTMLDialogElement | null): void {
  if (dialog === null) return;
  dialog.showModal();
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    dialog.close();
  });
}
