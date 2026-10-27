import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Sheet } from './Sheet';

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
    <Sheet
      size="confirm"
      title={confirmLabel}
      label={confirmLabel}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" icon="close" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" icon="trash" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="m-0 text-body text-ink">{question}</p>
    </Sheet>
  );
}
