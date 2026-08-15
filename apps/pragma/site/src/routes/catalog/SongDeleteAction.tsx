/**
 * The delete control at the foot of the song edit form, and the question it
 * asks first.
 *
 * It is its own component so the destructive path is one small file a reviewer
 * can read whole: the button sits apart from Save behind a rule, and the write
 * only happens once the reader has answered. The two used to be 8px apart on
 * the same row with nothing between the tap and the deletion.
 */

import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/atoms/Button';
import { Icon } from '../../components/atoms/Icon';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';

interface SongDeleteActionProps {
  readonly onDelete: () => void;
}

// @FollowsBlueprint organism-presentational
export function SongDeleteAction({ onDelete }: SongDeleteActionProps): JSX.Element {
  const { t } = useTranslation();
  const [isPending, setIsPending] = useState<boolean>(false);
  return (
    <div className="flex mt-6 pt-4 border-t border-line">
      <Button
        type="button"
        variant="ghost"
        className="text-danger ml-auto"
        onClick={() => setIsPending(true)}
      >
        <Icon name="trash" size={14} />
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
