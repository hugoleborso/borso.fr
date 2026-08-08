import type { ReactNode } from 'react';

interface ModalProps {
  title: string;
  closeLabel: string;
  children: ReactNode;
  onClose: () => void;
}

/**
 * A native `<dialog>` only renders as a modal, with its focus trap and its
 * backdrop, after an imperative `showModal()`. The ref callback is where that
 * call belongs: React runs it when the element attaches and runs the returned
 * cleanup when it detaches, which is the whole lifecycle the dialog needs.
 */
function openAsModalDialog(dialog: HTMLDialogElement | null): () => void {
  dialog?.showModal();
  return () => dialog?.close();
}

export function Modal({ title, closeLabel, children, onClose }: ModalProps) {
  return (
    <dialog ref={openAsModalDialog} className="modal-dialog" aria-label={title} onClose={onClose}>
      <div className="modal">
        <div className="controls-row" style={{ justifyContent: 'space-between' }}>
          <h3>{title}</h3>
          <button type="button" className="btn" aria-label={closeLabel} onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
