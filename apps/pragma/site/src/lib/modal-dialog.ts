/**
 * Ref callback that opens a native `<dialog>` as a modal the moment
 * React attaches it, and does nothing when React detaches it.
 *
 * It is a module-level function rather than an inline arrow, so React
 * sees the same identity on every render and attaches the node once. A
 * dialog is therefore opened where it is rendered, with no effect
 * watching an `open` prop. Render the dialog only while it should be
 * open, and let `onClose` tell the parent when the user dismisses it.
 */

export function openDialogOnAttach(dialog: HTMLDialogElement | null): void {
  dialog?.showModal();
}
