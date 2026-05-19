/**
 * Session detail. Renders the concert/practice metadata and, if the
 * session has a setlist, embeds the SetlistEditor. Creating a setlist
 * is a single click on the "build setlist" button — the API ensures
 * one-setlist-per-session via the unique constraint.
 */

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { z } from 'zod';
import { ApiError, apiRequest } from '../../lib/api-client';
import { formatSessionDate } from '../../lib/formatters.utils';
import { SetlistEditor } from '../setlists/SetlistEditor';

const sessionSchema = z.object({
  id: z.string().uuid(),
  kind: z.string(),
  date: z.string(),
  preparedConcertId: z.string().nullable(),
  venue: z.string().nullable(),
  capacity: z.number().nullable(),
  gear: z.string().nullable(),
  friendsCountPerMember: z.unknown(),
});
const singleSessionSchema = z.object({ session: sessionSchema });

const setlistSchema = z.object({ id: z.string().uuid(), sessionId: z.string().uuid() });
const singleSetlistSchema = z.object({ setlist: setlistSchema });

type Session = z.infer<typeof sessionSchema>;
type Setlist = z.infer<typeof setlistSchema>;

export function SessionDetailPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (): Promise<void> => {
    if (sessionId === undefined) return;
    setLoading(true);
    try {
      const body = singleSessionSchema.parse(await apiRequest(`/api/sessions/${sessionId}`));
      setSession(body.session);
      try {
        const setlistBody = singleSetlistSchema.parse(
          await apiRequest(`/api/setlists/by-session/${sessionId}`),
        );
        setSetlist(setlistBody.setlist);
      } catch (caught) {
        if (caught instanceof ApiError && caught.status === 404) setSetlist(null);
        else throw caught;
      }
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'unknown-error');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const buildSetlist = async (): Promise<void> => {
    if (sessionId === undefined) return;
    try {
      const created = singleSetlistSchema.parse(
        await apiRequest('/api/setlists', { method: 'POST', body: { sessionId } }),
      );
      setSetlist(created.setlist);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'unknown-error');
    }
  };

  if (loading) return <p className="admin-page-loading">{t('common.loading')}</p>;
  if (session === null) return <p className="admin-page-error">{error ?? 'not found'}</p>;

  return (
    <section className="session-detail-page">
      <Link className="back-link" to="/sessions">
        {t('common.back')}
      </Link>
      <h2 className="admin-page-title">
        {t(session.kind === 'concert' ? 'sessions.kindConcert' : 'sessions.kindPractice')}{' '}
        — {formatSessionDate(session.date, i18n.language)}
      </h2>
      {error !== null ? <p className="admin-page-error">{error}</p> : null}
      <dl className="session-meta">
        {session.venue !== null ? (
          <>
            <dt>{t('sessions.venue')}</dt>
            <dd>{session.venue}</dd>
          </>
        ) : null}
        {session.capacity !== null ? (
          <>
            <dt>{t('sessions.capacity')}</dt>
            <dd>{session.capacity}</dd>
          </>
        ) : null}
        {session.gear !== null && session.gear !== '' ? (
          <>
            <dt>{t('sessions.gear')}</dt>
            <dd>{session.gear}</dd>
          </>
        ) : null}
        {session.preparedConcertId !== null ? (
          <>
            <dt>{t('sessions.preparedConcert')}</dt>
            <dd>
              <Link to={`/sessions/${session.preparedConcertId}`}>
                {session.preparedConcertId.slice(0, 8)}
              </Link>
            </dd>
          </>
        ) : null}
      </dl>
      <h3 className="admin-page-form-title">{t('sessions.setlist')}</h3>
      {setlist === null ? (
        <button type="button" className="admin-page-form-submit" onClick={() => void buildSetlist()}>
          {t('sessions.buildSetlist')}
        </button>
      ) : (
        <SetlistEditor setlistId={setlist.id} />
      )}
    </section>
  );
}
