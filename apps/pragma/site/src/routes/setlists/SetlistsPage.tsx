/**
 * Setlists index — every setlist the band has written, whether or not a
 * session carries it yet, with the sessions playing each one. New
 * setlists are born here as well as from a session's own page, because
 * a set is often written before anyone knows which rehearsal will run
 * through it.
 * @Feature setlists
 */

import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/atoms/Button';
import { Icon } from '../../components/atoms/Icon';
import { BottomActionBar } from '../../components/molecules/BottomActionBar';
import { PageHeader } from '../../components/molecules/PageHeader';
import { SetlistSummaryRow } from '../../components/molecules/SetlistSummaryRow';
import { CreateSetlistDialog } from '../../components/organisms/CreateSetlistDialog';
import { ApiError } from '../../lib/api.client';
import { formatSessionDate } from '../../lib/formatters.utils';
import { useNavigateTo } from '../../lib/navigation.hook';
import { useSessionsList } from '../../lib/queries/sessions.queries';
import { useSetlistsList } from '../../lib/queries/setlists.queries';
import { buildSetlistIndexRows, type IndexSession } from './setlist-index.core';

const NO_ROWS: readonly never[] = [];

// @FollowsBlueprint route-list-page
export function SetlistsPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const navigateTo = useNavigateTo();
  const setlistsQuery = useSetlistsList();
  const sessionsQuery = useSessionsList();
  const [isCreating, setIsCreating] = useState(false);

  const rows = useMemo(
    () =>
      buildSetlistIndexRows<IndexSession>(
        setlistsQuery.data?.setlists ?? NO_ROWS,
        sessionsQuery.data?.sessions ?? NO_ROWS,
      ),
    [setlistsQuery.data, sessionsQuery.data],
  );

  const isLoading = setlistsQuery.isLoading || sessionsQuery.isLoading;
  const error =
    setlistsQuery.error instanceof ApiError
      ? setlistsQuery.error.message
      : sessionsQuery.error instanceof ApiError
        ? sessionsQuery.error.message
        : null;

  const describeSessions = (sessions: readonly IndexSession[]): string | null => {
    if (sessions.length === 0) return t('setlist.noSession');
    return sessions
      .map((session) => session.venue ?? formatSessionDate(session.date, i18n.language))
      .join(' · ');
  };

  return (
    <section className="px-4 sm:px-9 py-7 pb-20 max-w-[1280px]">
      <PageHeader
        crumb={t('nav.setlists')}
        title={t('setlist.title')}
        subtitle={t('setlist.indexSubtitle')}
      />

      <BottomActionBar>
        <Button variant="accent" onClick={() => setIsCreating(true)}>
          <Icon name="plus" size={14} />
          {t('setlist.new')}
        </Button>
      </BottomActionBar>

      {error === null ? null : (
        <p className="text-danger text-sm mb-3" role="alert">
          {error}
        </p>
      )}
      {isLoading ? <p className="text-ink-400 italic text-sm">{t('common.loading')}</p> : null}
      {!isLoading && rows.length === 0 ? (
        <p className="text-ink-400 italic text-sm">{t('setlist.indexEmpty')}</p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.id}>
            <SetlistSummaryRow
              id={row.id}
              name={row.name}
              songCount={row.songCount}
              sessionsLabel={describeSessions(row.sessions)}
            />
          </li>
        ))}
      </ul>

      {isCreating ? (
        <CreateSetlistDialog
          sessionId={null}
          suggestedName={t('setlist.create.defaultName', { index: rows.length + 1 })}
          onClose={() => setIsCreating(false)}
          onCreated={(setlistId) => navigateTo(`/setlists/${setlistId}`)}
        />
      ) : null}
    </section>
  );
}
