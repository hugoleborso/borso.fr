/** @Feature setlists */

import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/atoms/Button';
import { BottomActions } from '../../components/atoms/BottomActions';
import { PageHeader } from '../../components/molecules/PageHeader';
import { SessionsSectionTabs } from '../../components/molecules/SessionsSectionTabs';
import { CreateSetlistDialog } from '../../components/organisms/CreateSetlistDialog';
import { SetlistCatalogList } from '../../components/organisms/SetlistCatalogList';
import { ApiError } from '../../lib/api.client';
import { useNavigateTo } from '../../lib/navigation.hook';
import { useSessionsList } from '../../lib/queries/sessions.queries';
import { useSetlistsList } from '../../lib/queries/setlists.queries';
import {
  buildSetlistIndexRows,
  type IndexSession,
  isPracticeSetlist,
} from '../../lib/setlist-index.core';

const NO_ROWS: readonly never[] = [];

// @FollowsBlueprint route-list-page
export function SetlistsPage(): JSX.Element {
  const { t } = useTranslation();
  const navigateTo = useNavigateTo();
  const setlistsQuery = useSetlistsList();
  const sessionsQuery = useSessionsList();
  const [isCreating, setIsCreating] = useState(false);

  const rows = useMemo(
    () =>
      buildSetlistIndexRows<IndexSession>(
        (setlistsQuery.data?.setlists ?? NO_ROWS).filter(
          (setlist) =>
            !isPracticeSetlist(setlist.sessionIds, sessionsQuery.data?.sessions ?? NO_ROWS),
        ),
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

  return (
    <section className="px-4 sm:px-9 py-4 sm:py-7 pb-20 max-w-[1280px]">
      <PageHeader title={t('sessions.title')}>
        <SessionsSectionTabs value="setlists" />
      </PageHeader>

      {error === null ? null : (
        <p className="text-danger text-meta mb-3" role="alert">
          {error}
        </p>
      )}
      {isLoading ? (
        <p className="text-ink-soft italic text-meta">{t('common.loading')}</p>
      ) : (
        <SetlistCatalogList rows={rows} />
      )}

      {isCreating ? (
        <CreateSetlistDialog
          sessionId={null}
          suggestedName={t('setlist.create.defaultName', { index: rows.length + 1 })}
          onClose={() => setIsCreating(false)}
          onCreated={(setlistId) => navigateTo(`/setlists/${setlistId}`)}
        />
      ) : null}
      <BottomActions>
        <Button variant="primary" icon="plus" onClick={() => setIsCreating(true)}>
          {t('setlist.new')}
        </Button>
      </BottomActions>
    </section>
  );
}
