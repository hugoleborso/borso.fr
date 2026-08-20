/**
 * A setlist's own page at `/setlists/:setlistId`: its name, the
 * sessions playing it, and the editor. The setlist is addressed by its
 * own identifier rather than through a session, because it no longer
 * belongs to one — the same set can be run in a rehearsal and played at
 * the concert that rehearsal prepares.
 * @Feature setlists
 */

import type { JSX } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { BackLink } from '../../components/molecules/BackLink';
import { NotFoundNotice } from '../../components/molecules/NotFoundNotice';
import { PageHeader } from '../../components/molecules/PageHeader';
import { SetlistEditor } from '../../components/organisms/SetlistEditor';
import { SetlistHeaderActions } from '../../components/organisms/SetlistHeaderActions';
import { formatSessionDate } from '../../lib/formatters.utils';
import { useNavigateTo } from '../../lib/navigation.hook';
import { selectSetlistDisplayName } from '../../lib/setlist-name.utils';
import { useSessionsList } from '../../lib/queries/sessions.queries';
import { useSetlist, useSetlistsList } from '../../lib/queries/setlists.queries';
import { buildSetlistIndexRows, type IndexSession } from '../../lib/setlist-index.core';

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

      <SetlistHeaderActions
        setlistId={setlistId}
        name={setlist.name}
        displayedName={displayedName}
        onDeleted={() => navigateTo('/setlists')}
      />

      <SetlistEditor setlistId={setlist.id} />
    </section>
  );
}
