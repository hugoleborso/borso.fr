/** @Feature setlists */

import type { SetlistStatus } from '@domain/setlist-vote.core';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigateTo } from '../../lib/navigation.hook';
import { useDeleteSetlist, useRenameSetlist } from '../../lib/queries/setlists.queries';
import { useSetVoteStatus } from '../../lib/queries/voting.queries';
import { Button } from '../atoms/Button';
import { IconButton } from '../atoms/IconButton';
import { Input } from '../atoms/Input';
import { ConfirmDialog } from '../molecules/ConfirmDialog';
import { Menu } from '../molecules/Menu';

interface SetlistHeaderActionsProps {
  readonly setlistId: string;
  readonly name: string;
  readonly displayedName: string;
  readonly status: SetlistStatus;
  readonly isConcert: boolean;
  readonly onCopyOrder: () => void;
  readonly onDeleted: () => void;
}

const VOTE_LABEL_BY_STATUS = {
  voting: 'voting.enterVote',
  locked: 'voting.openVote',
} as const satisfies Readonly<Record<SetlistStatus, string>>;

export function SetlistHeaderActions({
  setlistId,
  name,
  displayedName,
  status,
  isConcert,
  onCopyOrder,
  onDeleted,
}: SetlistHeaderActionsProps): JSX.Element {
  const { t } = useTranslation();
  const navigateTo = useNavigateTo();
  const renameSetlist = useRenameSetlist();
  const deleteSetlist = useDeleteSetlist();
  const setVoteStatus = useSetVoteStatus(setlistId);
  const goToVote = (): void => navigateTo(`/setlists/${setlistId}/vote`);
  const voteActionByStatus = {
    voting: goToVote,
    locked: () =>
      setVoteStatus.mutate({ status: 'voting', targetSongCount: null }, { onSuccess: goToVote }),
  } as const satisfies Readonly<Record<SetlistStatus, () => void>>;
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
        <Menu
          label={t('setlist.moreActions')}
          items={[
            {
              label: t('scene.title'),
              icon: 'play',
              tone: 'default',
              onSelect: () => navigateTo(`/setlists/${setlistId}/scene`),
            },
            {
              label: t(VOTE_LABEL_BY_STATUS[status]),
              icon: 'vote',
              tone: 'default',
              onSelect: voteActionByStatus[status],
            },
            ...(isConcert
              ? [
                  {
                    label: t('audience.panelTitle'),
                    icon: 'audience',
                    tone: 'default',
                    onSelect: () => navigateTo(`/setlists/${setlistId}/audience`),
                  } as const,
                ]
              : []),
            {
              label: t('setlist.copyOrder'),
              icon: 'copy',
              tone: 'default',
              onSelect: onCopyOrder,
            },
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
            variant="secondary"
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
      {setVoteStatus.isError ? (
        <p className="text-danger text-meta" role="alert">
          {t('setlist.failure.openVote')}
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
