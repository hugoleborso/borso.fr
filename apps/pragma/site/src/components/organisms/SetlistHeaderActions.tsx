/** @Feature setlists */

import type { JSX, ReactNode } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useDeleteSetlist, useRenameSetlist } from '../../lib/queries/setlists.queries';
import { Button } from '../atoms/Button';
import { iconButtonVariants } from '../atoms/button.variants';
import { Icon } from '../atoms/Icon';
import { IconButton } from '../atoms/IconButton';
import { Input } from '../atoms/Input';
import { ConfirmDialog } from '../molecules/ConfirmDialog';
import { Menu } from '../molecules/Menu';

interface SetlistHeaderActionsProps {
  readonly setlistId: string;
  readonly name: string;
  readonly displayedName: string;
  readonly onDeleted: () => void;
  readonly trailing: ReactNode;
}

export function SetlistHeaderActions({
  setlistId,
  name,
  displayedName,
  onDeleted,
  trailing,
}: SetlistHeaderActionsProps): JSX.Element {
  const { t } = useTranslation();
  const renameSetlist = useRenameSetlist();
  const deleteSetlist = useDeleteSetlist();
  const [draftName, setDraftName] = useState<string | null>(null);
  const [isConfirmingDeletion, setIsConfirmingDeletion] = useState(false);

  const saveName = (): void => {
    if (draftName === null) return;
    renameSetlist.mutate({ setlistId, name: draftName.trim() });
    setDraftName(null);
  };

  const confirmDeletion = (): void => {
    setIsConfirmingDeletion(false);
    deleteSetlist.mutate({ setlistId }, { onSuccess: onDeleted });
  };

  return (
    <>
      {draftName === null ? (
        <div className="flex items-center gap-1">
          <Link
            to={`/setlists/${setlistId}/scene`}
            aria-label={t('scene.title')}
            title={t('scene.title')}
            className={iconButtonVariants({ variant: 'quiet' })}
          >
            <Icon name="play" size="md" />
          </Link>
          {trailing}
          <Menu
            label={t('setlist.moreActions')}
            items={[
              {
                label: t('setlist.rename.label'),
                icon: 'edit',
                tone: 'default',
                onSelect: () => setDraftName(name),
              },
              {
                label: t('setlist.delete.button'),
                icon: 'trash',
                tone: 'danger',
                onSelect: () => setIsConfirmingDeletion(true),
              },
            ]}
          />
        </div>
      ) : (
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <Input
            type="text"
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            aria-label={t('setlist.rename.label')}
            className="flex-1 min-w-0"
          />
          <Button
            icon="check"
            variant="primary"
            onClick={saveName}
            disabled={renameSetlist.isPending}
          >
            {t('setlist.rename.save')}
          </Button>
          <IconButton icon="close" label={t('common.cancel')} onClick={() => setDraftName(null)} />
        </div>
      )}

      {renameSetlist.isError ? (
        <p className="text-danger text-meta" role="alert">
          {t('setlist.failure.rename')}
        </p>
      ) : null}
      {deleteSetlist.isError ? (
        <p className="text-danger text-meta" role="alert">
          {t('setlist.failure.delete')}
        </p>
      ) : null}

      {isConfirmingDeletion ? (
        <ConfirmDialog
          question={t('setlist.delete.confirm', { name: displayedName })}
          confirmLabel={t('setlist.delete.button')}
          onConfirm={confirmDeletion}
          onCancel={() => setIsConfirmingDeletion(false)}
        />
      ) : null}
    </>
  );
}
