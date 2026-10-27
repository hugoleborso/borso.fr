import { describe, expect, it, vi } from 'vitest';
import {
  focusFirstField,
  openDialogOnAttach,
  openDismissibleDialogOnAttach,
} from './modal-dialog.adapter';

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

function sheetWith(bodyMarkup: string): HTMLDialogElement {
  const dialog = document.createElement('dialog');
  dialog.innerHTML = `<button data-sheet-close>Close</button><div data-sheet-body>${bodyMarkup}</div>`;
  dialog.setAttribute('open', '');
  document.body.append(dialog);
  return dialog;
}

describe('focusFirstField', () => {
  it('puts the focus in the first field a person types in, in page order, never on Close', () => {
    const dialog = sheetWith(
      '<input type="checkbox" /><button>Cancel</button><textarea id="note"></textarea><input id="key" />',
    );
    focusFirstField(dialog);
    expect(document.activeElement?.id).toBe('note');
    dialog.remove();
  });

  it('reaches a textarea or a select when the body holds no input', () => {
    const dialog = sheetWith('<select id="status"><option>a</option></select>');
    focusFirstField(dialog);
    expect(document.activeElement?.id).toBe('status');
    dialog.remove();
  });

  it('puts the focus on Close when the sheet holds no field', () => {
    const dialog = sheetWith('<p>Remove this song?</p><button>Remove</button>');
    focusFirstField(dialog);
    expect(document.activeElement?.hasAttribute('data-sheet-close')).toBe(true);
    dialog.remove();
  });

  it('does nothing in a dialog with neither', () => {
    const dialog = document.createElement('dialog');
    expect(() => {
      focusFirstField(dialog);
    }).not.toThrow();
  });
});
