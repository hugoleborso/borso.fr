/** @Feature songs */

import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { ConfirmDialog } from '../molecules/ConfirmDialog';

interface SongDeleteActionProps {
  readonly onDelete: () => void;
}

// @FollowsBlueprint organism-presentational
export function SongDeleteAction({ onDelete }: SongDeleteActionProps): JSX.Element {
  const { t } = useTranslation();
  const [isPending, setIsPending] = useState<boolean>(false);
  return (
    <div className="flex mt-6 pt-4 border-t border-rule">
      <Button
        type="button"
        variant="quiet"
        className="text-danger ml-auto"
        onClick={() => setIsPending(true)}
        icon="trash"
      >
        {t('common.delete')}
      </Button>
      {isPending ? (
        <ConfirmDialog
          question={t('catalog.deleteConfirm')}
          confirmLabel={t('common.delete')}
          onConfirm={() => {
            setIsPending(false);
            onDelete();
          }}
          onCancel={() => setIsPending(false)}
        />
      ) : null}
    </div>
  );
}
