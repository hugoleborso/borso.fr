/**
 * Setlists index — lists every session that already carries a
 * setlist. Tapping a row drills into the session detail, which mounts
 * the SetlistEditor for that setlist.
 *
 * The /setlists route exists so the sidebar has its prototype-fidelity
 * primary entry (catalog / sessions / setlists / bars); the editor
 * surface itself lives inside the session detail page.
 */

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Icon } from '../../components/atoms/Icon';
import { PageHeader } from '../../components/molecules/PageHeader';
import { ApiError, apiRequest } from '../../lib/api-client';
import { formatSessionDate } from '../../lib/formatters.utils';

const sessionSchema = z.object({
  id: z.string().uuid(),
  kind: z.string(),
  date: z.string(),
  venue: z.string().nullable(),
});
const sessionListSchema = z.object({ sessions: z.array(sessionSchema) });

const setlistSchema = z.object({ id: z.string().uuid(), sessionId: z.string().uuid() });
const singleSetlistSchema = z.object({ setlist: setlistSchema });

type Session = z.infer<typeof sessionSchema>;
type Setlist = z.infer<typeof setlistSchema>;

interface ConcertSetlist {
  readonly session: Session;
  readonly setlist: Setlist;
}

export function SetlistsPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const [rows, setRows] = useState<ConcertSetlist[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const sessionsBody = sessionListSchema.parse(await apiRequest('/api/sessions'));
      const concerts = sessionsBody.sessions
        .filter((entry) => entry.kind === 'concert')
        .toSorted((left, right) => right.date.localeCompare(left.date));

      const collected: ConcertSetlist[] = [];
      for (const session of concerts) {
        try {
          const setlistBody = singleSetlistSchema.parse(
            await apiRequest(`/api/setlists/by-session/${session.id}`),
          );
          collected.push({ session, setlist: setlistBody.setlist });
        } catch (caught) {
          if (caught instanceof ApiError && caught.status === 404) continue;
          throw caught;
        }
      }
      setRows(collected);
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

  return (
    <section className="px-9 py-7 pb-20 max-w-[1280px]">
      <PageHeader
        crumb={t('nav.setlists')}
        title={t('setlist.title')}
        subtitle={t('setlist.indexSubtitle')}
      />

      {error !== null ? (
        <p className="text-danger text-sm mb-3" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p className="text-ink-400 italic text-sm">{t('common.loading')}</p>
      ) : null}
      {!loading && rows.length === 0 ? (
        <p className="text-ink-400 italic text-sm">{t('setlist.indexEmpty')}</p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {rows.map(({ session, setlist }) => (
          <li key={setlist.id}>
            <Link
              to={`/sessions/${session.id}`}
              className="flex items-center gap-3 bg-bg-elev border border-line rounded-md px-4 py-3 hover:border-line-strong transition-colors"
            >
              <Icon name="setlist" size={18} className="text-ink-500" />
              <div className="flex-1 min-w-0">
                <div className="font-display italic text-xl text-ink-900 leading-tight truncate">
                  {session.venue ?? t('sessions.kindConcert')}
                </div>
                <div className="text-[12px] text-ink-500 mt-0.5">
                  {formatSessionDate(session.date, i18n.language)}
                </div>
              </div>
              <Icon name="chevR" size={14} className="text-ink-400" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
