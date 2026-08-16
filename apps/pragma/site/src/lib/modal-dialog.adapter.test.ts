/**
 * jsdom carries no `showModal`, which is the honest shape of the test anyway:
 * these callbacks exist to call an imperative browser method at attach time,
 * so the method is the thing to observe.
 */

import { describe, expect, it, vi } from 'vitest';
import { openDialogOnAttach, openDismissibleDialogOnAttach } from './modal-dialog.adapter';

interface StubbedDialog {
  readonly dialog: HTMLDialogElement;
  readonly showModal: ReturnType<typeof vi.fn>;
  readonly close: ReturnType<typeof vi.fn>;
}

function dialogElement(): StubbedDialog {
  const dialog = document.createElement('dialog');
  const showModal = vi.fn();
  const close = vi.fn();
  dialog.showModal = showModal;
  dialog.close = close;
  return { dialog, showModal, close };
}

describe('openDialogOnAttach', () => {
  it('opens the dialog as a modal when React attaches it', () => {
    const { dialog, showModal } = dialogElement();
    openDialogOnAttach(dialog);
    expect(showModal).toHaveBeenCalledTimes(1);
  });

  it('does nothing on the detach call React makes with null', () => {
    expect(() => {
      openDialogOnAttach(null);
    }).not.toThrow();
  });
});

describe('openDismissibleDialogOnAttach', () => {
  it('opens the dialog as a modal when React attaches it', () => {
    const { dialog, showModal } = dialogElement();
    openDismissibleDialogOnAttach(dialog);
    expect(showModal).toHaveBeenCalledTimes(1);
  });

  it('does nothing on the detach call React makes with null', () => {
    expect(() => {
      openDismissibleDialogOnAttach(null);
    }).not.toThrow();
  });

  it('closes when the reader taps beside the sheet', () => {
    const { dialog, close } = dialogElement();
    openDismissibleDialogOnAttach(dialog);
    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('stays open when the tap lands on the content inside it', () => {
    const { dialog, close } = dialogElement();
    const content = document.createElement('div');
    dialog.append(content);
    document.body.append(dialog);
    openDismissibleDialogOnAttach(dialog);
    content.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(close).not.toHaveBeenCalled();
    dialog.remove();
  });
});
