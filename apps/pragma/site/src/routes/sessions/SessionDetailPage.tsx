/** @Feature sessions */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { NotFoundNotice } from '../../components/molecules/NotFoundNotice';
import { SessionDetail } from '../../components/organisms/SessionDetail';
import { useMembersList } from '../../lib/queries/members.queries';
import { useSession, useSessionsList } from '../../lib/queries/sessions.queries';
import { useSetlistsBySession } from '../../lib/queries/setlists.queries';
import { selectMissingSessionMessageKey } from './missing-session.core';

const NO_ROWS: readonly never[] = [];

/**
 * @Blueprint route-detail-page
 * @BlueprintName Route Detail Page
 * @BlueprintUsage Use for a route that reads one record named by a route parameter.
 * @BlueprintDescription Reads the identifier with `useParams`, passes it to the id scoped query hooks together with an enabled flag so no request fires for an absent parameter, and returns early for the loading and the missing record cases before any markup that assumes the record exists. Everything after the early returns is a read organism taking plain props, so the page stays a thin orchestrator over the query hooks.
 */
export function SessionDetailPage(): JSX.Element {
  const { t } = useTranslation();
  const { sessionId } = useParams<{ sessionId: string }>();
  const sessionQuery = useSession(sessionId ?? '', sessionId !== undefined);
  const membersQuery = useMembersList();
  const sessionsQuery = useSessionsList();
  const setlistsQuery = useSetlistsBySession(sessionId ?? '', sessionId !== undefined);

  const session = sessionQuery.data?.session ?? null;
  const members = membersQuery.data?.members ?? NO_ROWS;
  const sessions = sessionsQuery.data?.sessions ?? NO_ROWS;
  const setlists = setlistsQuery.data?.setlists ?? NO_ROWS;
  const isLoading = sessionQuery.isLoading || membersQuery.isLoading || sessionsQuery.isLoading;

  if (isLoading) {
    return (
      <p className="px-4 sm:px-9 py-4 sm:py-7 text-ink-soft italic text-meta">
        {t('common.loading')}
      </p>
    );
  }
  if (session === null) {
    return (
      <NotFoundNotice
        message={t(selectMissingSessionMessageKey(sessionQuery.error))}
        backTo="/sessions"
        backLabel={t('sessions.title')}
      />
    );
  }

  return (
    <SessionDetail
      session={session}
      members={members}
      sessions={sessions}
      setlists={setlists}
      isSetlistsLoading={setlistsQuery.isLoading}
    />
  );
}
