/**
 * A setlist's own page at `/setlists/:setlistId`: its name, the
 * sessions playing it, and the editor. The setlist is addressed by its
 * own identifier rather than through a session, because it no longer
 * belongs to one — the same set can be run in a rehearsal and played at
 * the concert that rehearsal prepares.
 * @Feature setlists
 */

import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Button } from '../../components/atoms/Button';
import { Icon } from '../../components/atoms/Icon';
import { Input } from '../../components/atoms/Input';
import { BackLink } from '../../components/molecules/BackLink';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { NotFoundNotice } from '../../components/molecules/NotFoundNotice';
import { PageHeader } from '../../components/molecules/PageHeader';
import { SetlistEditor } from '../../components/organisms/SetlistEditor';
import { formatSessionDate } from '../../lib/formatters.utils';
import { useNavigateTo } from '../../lib/navigation.hook';
import { selectSetlistDisplayName } from '../../lib/setlist-name.utils';
import { useSessionsList } from '../../lib/queries/sessions.queries';
import {
  useDeleteSetlist,
  useRenameSetlist,
  useSetlist,
  useSetlistsList,
} from '../../lib/queries/setlists.queries';
import { buildSetlistIndexRows, type IndexSession } from './setlist-index.core';

const NO_ROWS: readonly never[] = [];

// @FollowsBlueprint route-detail-page
export function SetlistEditorPage(): JSX.Element {
  const { setlistId } = useParams<{ setlistId: string }>();
  const { t } = useTranslation();
  if (setlistId === undefined) {
    return <p className="px-4 sm:px-9 py-7 text-danger">{t('setlist.missingId')}</p>;
  }
  return <SetlistDetail setlistId={setlistId} />;
}

function SetlistDetail({ setlistId }: { setlistId: string }): JSX.Element {
  const { t, i18n } = useTranslation();
  const navigateTo = useNavigateTo();
  const setlistQuery = useSetlist(setlistId);
  const setlistsQuery = useSetlistsList();
  const sessionsQuery = useSessionsList();
  const renameSetlist = useRenameSetlist();
  const deleteSetlist = useDeleteSetlist();
  const [draftName, setDraftName] = useState<string | null>(null);
  const [isConfirmingDeletion, setIsConfirmingDeletion] = useState(false);

  const setlist = setlistQuery.data?.setlist ?? null;

  const sessions = useMemo(() => {
    const row = buildSetlistIndexRows<IndexSession>(
      setlistsQuery.data?.setlists ?? NO_ROWS,
      sessionsQuery.data?.sessions ?? NO_ROWS,
    ).find((candidate) => candidate.id === setlistId);
    return row?.sessions ?? NO_ROWS;
  }, [setlistsQuery.data, sessionsQuery.data, setlistId]);

  if (setlistQuery.isLoading) {
    return <p className="px-4 sm:px-9 py-7 italic text-ink-400 text-sm">{t('common.loading')}</p>;
  }

  if (setlist === null) {
    return (
      <NotFoundNotice
        message={t('setlist.notFound')}
        backTo="/setlists"
        backLabel={t('setlist.title')}
      />
    );
  }

  const displayedName = selectSetlistDisplayName(setlist.name, t('setlist.untitled'));

  const saveName = (): void => {
    if (draftName === null) return;
    renameSetlist.mutate({ setlistId, name: draftName.trim() });
    setDraftName(null);
  };

  const confirmDeletion = (): void => {
    setIsConfirmingDeletion(false);
    deleteSetlist.mutate({ setlistId }, { onSuccess: () => navigateTo('/setlists') });
  };

  return (
    <section className="px-4 sm:px-9 py-7 pb-20 max-w-[1280px] flex flex-col">
      <BackLink to="/setlists" label={t('setlist.title')} />
      <PageHeader
        crumb={t('setlist.crumb')}
        title={displayedName}
        subtitle={
          sessions.length === 0
            ? t('setlist.noSession')
            : `${t('setlist.playedIn')} ${sessions
                .map((session) => session.venue ?? formatSessionDate(session.date, i18n.language))
                .join(' · ')}`
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {draftName === null ? (
          <Button variant="default" onClick={() => setDraftName(setlist.name)}>
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

      <SetlistEditor setlistId={setlist.id} />

      {isConfirmingDeletion ? (
        <ConfirmDialog
          question={t('setlist.delete.confirm', { name: displayedName })}
          confirmLabel={t('setlist.delete.button')}
          onConfirm={confirmDeletion}
          onCancel={() => setIsConfirmingDeletion(false)}
        />
      ) : null}
    </section>
  );
}
