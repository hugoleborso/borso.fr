/**
 * Setlists index — every concert the band has on the books, whether or not
 * it already carries a setlist. A concert that carries one drills into the
 * session detail, which mounts the editor; a concert that carries none is
 * built from here in one tap.
 *
 * Listing only the concerts that already had a setlist made this page a
 * mirror with no door: the sole way to start a set was to know it is born on
 * a concert's own page, and a band whose every concert already had one could
 * not create a setlist anywhere in the application.
 * @Feature setlists
 */

import type { JSX } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '../../components/atoms/Button';
import { composeClassName } from '../../components/atoms/class-name.utils';
import { Icon } from '../../components/atoms/Icon';
import { PageHeader } from '../../components/molecules/PageHeader';
import { ApiError } from '../../lib/api.client';
import { formatSessionDate } from '../../lib/formatters.utils';
import { useNavigateTo } from '../../lib/navigation.hook';
import { useSessionsList } from '../../lib/queries/sessions.queries';
import { useCreateSetlist, useSetlistsBySessionIds } from '../../lib/queries/setlists.queries';
import { buildSetlistIndexRows, selectConcertsNewestFirst } from './setlist-index.core';

const NO_ROWS: readonly never[] = [];
const CARD_CLASS = 'flex items-center gap-3 bg-bg-elev border border-line rounded-md px-4 py-3';

// @FollowsBlueprint route-list-page
export function SetlistsPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const navigateTo = useNavigateTo();
  const sessionsQuery = useSessionsList();
  const createSetlist = useCreateSetlist();

  const concerts = useMemo(
    () => selectConcertsNewestFirst(sessionsQuery.data?.sessions ?? NO_ROWS),
    [sessionsQuery.data],
  );

  const concertIds = useMemo(() => concerts.map((session) => session.id), [concerts]);
  const setlistQueries = useSetlistsBySessionIds(concertIds);

  const rows = useMemo(
    () =>
      buildSetlistIndexRows(
        concerts,
        setlistQueries.map((query) => query.data),
      ),
    [concerts, setlistQueries],
  );

  const isLoading = sessionsQuery.isLoading || setlistQueries.some((query) => query.isLoading);
  const error =
    sessionsQuery.error instanceof ApiError
      ? sessionsQuery.error.message
      : (setlistQueries.find((query) => query.error instanceof ApiError)?.error?.message ?? null);

  const buildSetlist = (sessionId: string): void => {
    createSetlist.mutate({ sessionId });
    navigateTo(`/sessions/${sessionId}/setlist`);
  };

  return (
    <section className="px-4 sm:px-9 py-7 pb-20 max-w-[1280px]">
      <PageHeader
        crumb={t('nav.setlists')}
        title={t('setlist.title')}
        subtitle={t('setlist.indexSubtitle')}
      />

      {error === null ? null : (
        <p className="text-danger text-sm mb-3" role="alert">
          {error}
        </p>
      )}
      {isLoading ? <p className="text-ink-400 italic text-sm">{t('common.loading')}</p> : null}
      {!isLoading && rows.length === 0 ? (
        <p className="text-ink-400 italic text-sm">
          {t('setlist.indexNoConcert')}{' '}
          <Link to="/sessions" className="text-accent underline">
            {t('sessions.title')}
          </Link>
        </p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {rows.map(({ session, setlistId }) => {
          const concertLine = (
            <>
              <Icon
                name="setlist"
                size={18}
                className={setlistId === null ? 'text-ink-300' : 'text-ink-500'}
              />
              <div className="flex-1 min-w-0">
                <div className="font-display italic text-xl text-ink-900 leading-tight truncate">
                  {session.venue ?? t('sessions.kindConcert')}
                </div>
                <div className="text-[12px] text-ink-500 mt-0.5">
                  {formatSessionDate(session.date, i18n.language)}
                </div>
              </div>
            </>
          );
          return (
            <li key={session.id}>
              {setlistId === null ? (
                <div className={CARD_CLASS}>
                  {concertLine}
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => buildSetlist(session.id)}
                    disabled={createSetlist.isPending}
                  >
                    <Icon name="plus" size={14} />
                    {t('setlist.createForSession')}
                  </Button>
                </div>
              ) : (
                <Link
                  to={`/sessions/${session.id}`}
                  className={composeClassName(
                    CARD_CLASS,
                    'hover:border-line-strong transition-colors',
                  )}
                >
                  {concertLine}
                  <Icon name="chevR" size={14} className="text-ink-400" />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
