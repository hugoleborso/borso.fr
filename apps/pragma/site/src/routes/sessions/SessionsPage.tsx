/**
 * Sessions list — concerts + practices in one chronological list.
 * Concerts carry a venue badge; practices carry a "prep" badge with the
 * linked concert. Create is gated by `CreateSessionDialog` (asks for
 * the date + the kind-specific fields); each row exposes a trash
 * affordance backed by `useDeleteSession` with optimistic removal.
 */

import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '../../components/atoms/Button';
import { Icon } from '../../components/atoms/Icon';
import { composeClassName } from '../../components/atoms/class-name.utils';
import { BottomActionBar } from '../../components/molecules/BottomActionBar';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { CreateSessionDialog } from '../../components/organisms/CreateSessionDialog';
import { PageHeader } from '../../components/molecules/PageHeader';
import { ApiError } from '../../lib/api';
import { formatSessionDate } from '../../lib/formatters.utils';
import { useNavigateTo } from '../../lib/navigation';
import { useDeleteSession, useSessionsList } from '../../lib/queries/sessions';

// @FollowsBlueprint route-list-page
export function SessionsPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const navigateTo = useNavigateTo();
  const sessionsQuery = useSessionsList();
  const deleteSession = useDeleteSession();

  const [creating, setCreating] = useState<'concert' | 'practice' | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<string | null>(null);

  const sessions = sessionsQuery.data?.sessions ?? [];
  const concerts = sessions.filter((session) => session.kind === 'concert');
  const error =
    sessionsQuery.error instanceof ApiError
      ? sessionsQuery.error.message
      : deleteSession.error instanceof ApiError
        ? deleteSession.error.message
        : null;

  const confirmDelete = (sessionId: string): void => {
    deleteSession.mutate({ id: sessionId });
    setPendingDeletion(null);
  };

  return (
    <section className="px-4 sm:px-9 py-7 pb-20 max-w-[1280px]">
      <PageHeader title={t('sessions.title')} subtitle={t('sessions.subtitle')} />

      <BottomActionBar>
        <Button variant="default" onClick={() => setCreating('practice')}>
          <Icon name="plus" size={14} />
          {t('sessions.kindPractice')}
        </Button>
        <Button variant="accent" onClick={() => setCreating('concert')}>
          <Icon name="plus" size={14} />
          {t('sessions.kindConcert')}
        </Button>
      </BottomActionBar>

      {error === null ? null : (
        <p className="text-danger text-sm mb-3" role="alert">
          {error}
        </p>
      )}
      {sessionsQuery.isLoading ? (
        <p className="text-ink-400 italic text-sm">{t('common.loading')}</p>
      ) : null}

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
                className={composeClassName(
                  'absolute -left-7 top-3.5 w-2.5 h-2.5 rounded-full',
                  isConcert ? 'bg-accent border-2 border-accent' : 'bg-bg border-2 border-ink-700',
                )}
                aria-hidden="true"
              />
              <div className="relative">
                <Link
                  to={`/sessions/${session.id}`}
                  className="block bg-bg-elev border border-line rounded-md px-4 py-3 pr-12 hover:border-line-strong transition-colors"
                >
                  <div className="text-xs font-mono uppercase tracking-wider text-ink-400 mb-1">
                    {isConcert ? '♪' : '⟳'}{' '}
                    {t(isConcert ? 'sessions.kindConcert' : 'sessions.kindPractice')}
                  </div>
                  <div className="font-display italic text-2xl text-ink-900 leading-tight">
                    {formatSessionDate(session.date, i18n.language)}
                  </div>
                  {session.venue === null ? null : (
                    <div className="text-[12.5px] text-ink-500 mt-0.5">{session.venue}</div>
                  )}
                </Link>
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setPendingDeletion(session.id);
                  }}
                  aria-label={t('sessions.delete.aria')}
                  className="absolute top-1/2 -translate-y-1/2 right-3 inline-flex items-center justify-center w-11 h-11 rounded-md text-ink-400 hover:text-danger hover:bg-bg transition-colors cursor-pointer"
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {creating === null ? null : (
        <CreateSessionDialog
          kind={creating}
          onClose={() => setCreating(null)}
          onCreated={(sessionId) => navigateTo(`/sessions/${sessionId}`)}
          existingConcerts={concerts.map((concert) => ({
            id: concert.id,
            date: concert.date,
            venue: concert.venue,
          }))}
        />
      )}

      {pendingDeletion === null ? null : (
        <ConfirmDialog
          question={t('sessions.delete.confirm')}
          confirmLabel={t('sessions.delete.button')}
          onConfirm={() => confirmDelete(pendingDeletion)}
          onCancel={() => setPendingDeletion(null)}
        />
      )}
    </section>
  );
}
