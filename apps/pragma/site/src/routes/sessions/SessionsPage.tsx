/**
 * Sessions list — concerts + practices in one chronological list.
 * Concerts carry a venue badge; practices carry a "prep" badge with the
 * linked concert.
 */

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../../components/atoms/Button';
import { Icon } from '../../components/atoms/Icon';
import { PageHeader } from '../../components/molecules/PageHeader';
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
    <section className="px-9 py-7 pb-20 max-w-[1280px]">
      <PageHeader
        title={t('sessions.title')}
        subtitle={t('sessions.subtitle')}
        actions={
          <>
            <Button variant="accent" onClick={() => void createSession('concert')}>
              <Icon name="plus" size={14} />
              {t('sessions.kindConcert')}
            </Button>
            <Button variant="default" onClick={() => void createSession('practice')}>
              <Icon name="plus" size={14} />
              {t('sessions.kindPractice')}
            </Button>
          </>
        }
      />

      {error !== null ? (
        <p className="text-danger text-sm mb-3" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? <p className="text-ink-400 italic text-sm">{t('common.loading')}</p> : null}

      <ul className="relative pl-8 flex flex-col gap-1">
        <span
          className="absolute top-1 bottom-1 left-2 w-px bg-line-strong pointer-events-none"
          aria-hidden="true"
        />
        {sessions.map((session) => {
          const isConcert = session.kind === 'concert';
          return (
            <li key={session.id} className="relative py-2">
              <span
                className={`absolute -left-7 top-3.5 w-2.5 h-2.5 rounded-full ${
                  isConcert ? 'bg-accent border-2 border-accent' : 'bg-bg border-2 border-ink-700'
                }`}
                aria-hidden="true"
              />
              <Link
                to={`/sessions/${session.id}`}
                className="block bg-bg-elev border border-line rounded-md px-4 py-3 hover:border-line-strong transition-colors"
              >
                <div className="text-[10.5px] font-mono uppercase tracking-wider text-ink-400 mb-1">
                  {isConcert ? '♪' : '⟳'} {t(isConcert ? 'sessions.kindConcert' : 'sessions.kindPractice')}
                </div>
                <div className="font-display italic text-2xl text-ink-900 leading-tight">
                  {formatSessionDate(session.date, i18n.language)}
                </div>
                {session.venue !== null ? (
                  <div className="text-[12.5px] text-ink-500 mt-0.5">{session.venue}</div>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
