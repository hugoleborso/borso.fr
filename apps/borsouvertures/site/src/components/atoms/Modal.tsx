import type { ReactNode } from 'react';
import { BUTTON_CLASS } from './buttonStyles';

interface ModalProps {
  title: string;
  closeLabel: string;
  children: ReactNode;
  onClose: () => void;
}

const DIALOG_CLASS =
  'm-auto p-0 max-w-none max-h-none bg-transparent text-inherit backdrop:bg-black/65';

// @FollowsBlueprint ref-callback-browser-api
function openAsModalDialog(dialog: HTMLDialogElement | null): () => void {
  dialog?.showModal();
  return () => dialog?.close();
}

// @FollowsBlueprint atom-plain
export function Modal({ title, closeLabel, children, onClose }: ModalProps) {
  return (
    <dialog ref={openAsModalDialog} className={DIALOG_CLASS} aria-label={title} onClose={onClose}>
      <div className="w-[min(420px,90vw)] p-5 rounded-[14px] border border-white/10 bg-modal shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="my-[1.17rem] text-[1.17rem] font-bold">{title}</h2>
          <button type="button" className={BUTTON_CLASS} aria-label={closeLabel} onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
