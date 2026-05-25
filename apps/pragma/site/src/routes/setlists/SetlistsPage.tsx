/**
 * Setlists index — lists every concert session that already carries a
 * setlist. Tapping a row drills into the session detail, which mounts
 * the SetlistEditor for that setlist.
 */

import { useQueries } from '@tanstack/react-query';
import type { JSX } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/atoms/Icon';
import { PageHeader } from '../../components/molecules/PageHeader';
import { ApiError, api } from '../../lib/api';
import { useSessionsList } from '../../lib/queries/sessions';
import { setlistKeys } from '../../lib/queries/setlists';
import { formatSessionDate } from '../../lib/formatters.utils';

export function SetlistsPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const sessionsQuery = useSessionsList();

  const concerts = useMemo(() => {
    const all = sessionsQuery.data?.sessions ?? [];
    return all
      .filter((entry) => entry.kind === 'concert')
      .toSorted((left, right) => right.date.localeCompare(left.date));
  }, [sessionsQuery.data]);

  const setlistQueries = useQueries({
    queries: concerts.map((session) => ({
      queryKey: setlistKeys.bySessionId(session.id),
      queryFn: async () => {
        const response = await api.api.setlists['by-session'][':sessionId'].$get({
          param: { sessionId: session.id },
        });
        if (response.status === 404) return null;
        if (!response.ok) throw new ApiError(response.status, `setlist ${response.status}`, null);
        return response.json();
      },
    })),
  });

  const rows = useMemo(
    () =>
      concerts
        .map((session, index) => ({ session, payload: setlistQueries[index]?.data ?? null }))
        .filter(
          (entry): entry is { session: (typeof concerts)[number]; payload: NonNullable<typeof entry.payload> } =>
            entry.payload !== null,
        ),
    [concerts, setlistQueries],
  );

  const loading = sessionsQuery.isLoading || setlistQueries.some((query) => query.isLoading);
  const error =
    sessionsQuery.error instanceof ApiError
      ? sessionsQuery.error.message
      : setlistQueries.find((q) => q.error instanceof ApiError)?.error?.message ?? null;

  return (
    <section className="px-4 sm:px-9 py-7 pb-20 max-w-[1280px]">
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
      {loading ? <p className="text-ink-400 italic text-sm">{t('common.loading')}</p> : null}
      {!loading && rows.length === 0 ? (
        <p className="text-ink-400 italic text-sm">{t('setlist.indexEmpty')}</p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {rows.map(({ session, payload }) => (
          <li key={payload.setlist.id}>
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
