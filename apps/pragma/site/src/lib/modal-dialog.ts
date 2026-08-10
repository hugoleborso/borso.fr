/**
 * Ref callback that opens a native `<dialog>` as a modal the moment
 * React attaches it, and does nothing when React detaches it.
 *
 * It is a module-level function rather than an inline arrow, so React
 * sees the same identity on every render and attaches the node once. A
 * dialog is therefore opened where it is rendered, with no effect
 * watching an `open` prop. Render the dialog only while it should be
 * open, and let `onClose` tell the parent when the user dismisses it.
 *
 * @Blueprint ref-callback-browser-api
 * @BlueprintName Ref Callback Driving A Browser API
 * @BlueprintUsage Use for calling an imperative DOM method when React attaches a node, in place of a mount effect.
 * @BlueprintDescription Declares the callback at module level so React sees one identity and attaches the node once, and reaches the method through optional chaining so the detach call, which passes null, is a no-op needing no branch. A dialog is opened where it is rendered, with nothing watching an open prop.
 */

export function openDialogOnAttach(dialog: HTMLDialogElement | null): void {
  dialog?.showModal();
}
