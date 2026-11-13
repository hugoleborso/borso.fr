import type { ReactNode } from 'react';
import { Icon } from '@/components/atoms/Icon';

interface ModalProps {
  title: string;
  closeLabel: string;
  children: ReactNode;
  onClose: () => void;
}

const DIALOG_CLASS =
  'mt-auto mb-0 mx-0 p-0 w-full max-w-none max-h-[88dvh] bg-transparent text-ink ' +
  'backdrop:bg-scrim roomy:m-auto roomy:w-[min(440px,90vw)]';

const SHEET_CLASS =
  'flex flex-col gap-4 max-h-[88dvh] overflow-y-auto px-4 pt-2 ' +
  'pb-[max(1.25rem,env(safe-area-inset-bottom))] rounded-t-xl bg-page ' +
  'roomy:p-5 roomy:rounded-xl';

const CLOSE_CLASS =
  'inline-flex items-center justify-center size-12 -mr-2 rounded-md text-ink hover:bg-surface';

// @FollowsBlueprint ref-callback-browser-api
function openAsModalDialog(dialog: HTMLDialogElement | null): () => void {
  dialog?.showModal();
  return () => dialog?.close();
}

// @FollowsBlueprint atom-plain
export function Modal({ title, closeLabel, children, onClose }: ModalProps) {
  return (
    <dialog
      ref={openAsModalDialog}
      className={DIALOG_CLASS}
      aria-label={title}
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
    >
      <div className={SHEET_CLASS}>
        <div className="flex items-center justify-between gap-3 pt-2 border-b-2 border-ink">
          <h2 className="text-xl font-bold leading-tight">{title}</h2>
          <button
            type="button"
            className={CLOSE_CLASS}
            aria-label={closeLabel}
            title={closeLabel}
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
