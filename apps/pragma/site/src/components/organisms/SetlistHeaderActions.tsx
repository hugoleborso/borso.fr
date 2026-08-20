/**
 * What a setlist's own page offers about the setlist itself: renaming it
 * in place, and deleting it behind a confirmation naming what goes with
 * it. The draft name lives here rather than on the route, because it is
 * the state of this control and nothing else reads it.
 * @Feature setlists
 */

import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDeleteSetlist, useRenameSetlist } from '../../lib/queries/setlists.queries';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { Input } from '../atoms/Input';
import { ConfirmDialog } from '../molecules/ConfirmDialog';

interface SetlistHeaderActionsProps {
  readonly setlistId: string;
  readonly name: string;
  readonly displayedName: string;
  readonly onDeleted: () => void;
}

export function SetlistHeaderActions({
  setlistId,
  name,
  displayedName,
  onDeleted,
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
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {draftName === null ? (
          <Button variant="default" onClick={() => setDraftName(name)}>
            <Icon name="edit" size={14} />
            {t('setlist.rename.label')}
          </Button>
        ) : (
          <>
            <Input
              type="text"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              aria-label={t('setlist.rename.label')}
              className="max-w-xs"
            />
            <Button variant="accent" onClick={saveName} disabled={renameSetlist.isPending}>
              {t('setlist.rename.save')}
            </Button>
            <Button variant="ghost" onClick={() => setDraftName(null)}>
              {t('common.cancel')}
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          onClick={() => setIsConfirmingDeletion(true)}
          aria-label={t('setlist.delete.aria')}
        >
          <Icon name="trash" size={14} />
          {t('setlist.delete.button')}
        </Button>
      </div>

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
