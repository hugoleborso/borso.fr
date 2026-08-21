import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { openDismissibleDialogOnAttach } from '../../lib/modal-dialog.adapter';
import { Button } from '../atoms/Button';

export interface ConfirmDialogProps {
  readonly question: string;
  readonly confirmLabel: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

// @FollowsBlueprint molecule-presentational
export function ConfirmDialog({
  question,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <dialog
      ref={openDismissibleDialogOnAttach}
      onClose={onCancel}
      className="m-auto w-[calc(100vw-2rem)] sm:w-[26rem] max-w-[26rem] rounded-lg border border-line bg-bg-elev p-0 backdrop:bg-ink-900/40"
    >
      <div className="p-4 flex flex-col gap-3">
        <p className="text-sm text-ink-700 m-0">{question}</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
