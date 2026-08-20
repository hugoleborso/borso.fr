/**
 * `/sessions/:sessionId/setlist` was the only address a setlist ever
 * had, back when a session carried exactly one. The band's phones have
 * the application installed, so that address is still on screens and in
 * bookmarks; it now forwards to the first setlist the session carries,
 * or to the session itself when it carries none.
 * @Feature setlists
 */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useParams } from 'react-router-dom';
import { useSetlistsBySession } from '../../lib/queries/setlists.queries';

export function SessionSetlistRedirectPage(): JSX.Element {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { t } = useTranslation();
  const setlistsQuery = useSetlistsBySession(sessionId ?? '', sessionId !== undefined);

  if (sessionId === undefined) return <Navigate to="/setlists" replace />;
  if (setlistsQuery.isLoading) {
    return <p className="px-4 sm:px-9 py-7 italic text-ink-400 text-sm">{t('common.loading')}</p>;
  }

  const first = setlistsQuery.data?.setlists[0];
  if (first === undefined) return <Navigate to={`/sessions/${sessionId}`} replace />;
  return <Navigate to={`/setlists/${first.id}`} replace />;
}
