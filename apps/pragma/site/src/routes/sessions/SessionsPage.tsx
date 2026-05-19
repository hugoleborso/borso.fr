/**
 * Sessions list — concerts + practices in one chronological list.
 * Concerts carry a venue badge; practices carry a "prep" badge with the
 * linked concert.
 */

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { ApiError, apiRequest } from '../../lib/api-client';
import { formatSessionDate } from '../../lib/formatters.utils';

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
const listSchema = z.object({ sessions: z.array(sessionSchema) });

type Session = z.infer<typeof sessionSchema>;

export function SessionsPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const body = listSchema.parse(await apiRequest('/api/sessions'));
      setSessions(body.sessions);
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'unknown-error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createSession = async (kind: 'concert' | 'practice'): Promise<void> => {
    const now = new Date().toISOString();
    const payload =
      kind === 'concert'
        ? {
            kind: 'concert' as const,
            date: now,
            venue: 'TBD',
            capacity: 0,
            gear: '',
            friendsCountPerMember: {},
          }
        : { kind: 'practice' as const, date: now, preparedConcertId: null };
    try {
      await apiRequest('/api/sessions', { method: 'POST', body: payload });
      await refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'unknown-error');
    }
  };

  return (
    <section className="sessions-page">
      <header className="catalog-page-header">
        <h2 className="admin-page-title">{t('sessions.title')}</h2>
        <div className="sessions-page-actions">
          <button
            type="button"
            className="admin-page-form-submit"
            onClick={() => void createSession('concert')}
          >
            + {t('sessions.kindConcert')}
          </button>
          <button
            type="button"
            className="admin-page-form-cancel"
            onClick={() => void createSession('practice')}
          >
            + {t('sessions.kindPractice')}
          </button>
        </div>
      </header>
      {error !== null ? <p className="admin-page-error">{error}</p> : null}
      {loading ? <p className="admin-page-loading">{t('common.loading')}</p> : null}
      <ul className="sessions-list">
        {sessions.map((session) => (
          <li key={session.id} className="session-row">
            <Link to={`/sessions/${session.id}`} className="session-row-link">
              <span className="session-row-kind">
                {session.kind === 'concert' ? '♪' : '⟳'}{' '}
                {t(session.kind === 'concert' ? 'sessions.kindConcert' : 'sessions.kindPractice')}
              </span>
              <span className="session-row-date">
                {formatSessionDate(session.date, i18n.language)}
              </span>
              {session.venue !== null ? (
                <span className="session-row-venue">{session.venue}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
