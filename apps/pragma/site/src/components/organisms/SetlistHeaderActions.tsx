/** @Feature setlists */

import type { JSX, ReactNode } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useDeleteSetlist, useRenameSetlist } from '../../lib/queries/setlists.queries';
import { Button } from '../atoms/Button';
import { buttonVariants } from '../atoms/button.variants';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { Input } from '../atoms/Input';
import { ConfirmDialog } from '../molecules/ConfirmDialog';
import { OverflowMenu } from '../molecules/OverflowMenu';

const ICON_ACTION_CLASS = composeClassName(
  buttonVariants({ variant: 'ghost', size: 'md' }),
  'no-underline w-11 px-0',
);

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
            className={ICON_ACTION_CLASS}
          >
            <Icon name="play" size={18} />
          </Link>
          {trailing}
          <OverflowMenu
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
          <Button variant="accent" onClick={saveName} disabled={renameSetlist.isPending}>
            {t('setlist.rename.save')}
          </Button>
          <Button
            variant="ghost"
            aria-label={t('common.cancel')}
            title={t('common.cancel')}
            className="w-11 px-0"
            onClick={() => setDraftName(null)}
          >
            <Icon name="close" size={18} />
          </Button>
        </div>
      )}

      {renameSetlist.isError ? (
        <p className="text-danger text-sm" role="alert">
          {t('setlist.failure.rename')}
        </p>
      ) : null}
      {deleteSetlist.isError ? (
        <p className="text-danger text-sm" role="alert">
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
