/**
 * Sessions list — concerts + practices in one chronological list.
 * Concerts carry a venue badge; practices carry a "prep" badge with the
 * linked concert. Create is gated by `CreateSessionDialog` (asks for
 * the date + the kind-specific fields); each row exposes a trash
 * affordance backed by `useDeleteSession` with optimistic removal.
 */

import { type JSX, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/atoms/Button';
import { Icon } from '../../components/atoms/Icon';
import { CreateSessionDialog } from '../../components/molecules/CreateSessionDialog';
import { PageHeader } from '../../components/molecules/PageHeader';
import { ApiError } from '../../lib/api';
import { formatSessionDate } from '../../lib/formatters.utils';
import { useDeleteSession, useSessionsList } from '../../lib/queries/sessions';

export function SessionsPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const sessionsQuery = useSessionsList();
  const deleteSession = useDeleteSession();

  const [creating, setCreating] = useState<'concert' | 'practice' | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<string | null>(null);
  const confirmDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = confirmDialogRef.current;
    if (dialog === null) return;
    const wantsOpen = pendingDeletion !== null;
    if (wantsOpen && !dialog.open) dialog.showModal();
    if (!wantsOpen && dialog.open) dialog.close();
  }, [pendingDeletion]);

  const sessions = sessionsQuery.data?.sessions ?? [];
  const concerts = sessions.filter((session) => session.kind === 'concert');
  const error =
    sessionsQuery.error instanceof ApiError
      ? sessionsQuery.error.message
      : deleteSession.error instanceof ApiError
        ? deleteSession.error.message
        : null;

  const confirmDelete = (): void => {
    if (pendingDeletion === null) return;
    deleteSession.mutate({ id: pendingDeletion });
    setPendingDeletion(null);
  };

  return (
    <section className="px-4 sm:px-9 py-7 pb-20 max-w-[1280px]">
      <PageHeader
        title={t('sessions.title')}
        subtitle={t('sessions.subtitle')}
        actions={
          <>
            <Button variant="accent" onClick={() => setCreating('concert')}>
              <Icon name="plus" size={14} />
              {t('sessions.kindConcert')}
            </Button>
            <Button variant="default" onClick={() => setCreating('practice')}>
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
                className={`absolute -left-7 top-3.5 w-2.5 h-2.5 rounded-full ${
                  isConcert ? 'bg-accent border-2 border-accent' : 'bg-bg border-2 border-ink-700'
                }`}
                aria-hidden="true"
              />
              <div className="relative">
                <Link
                  to={`/sessions/${session.id}`}
                  className="block bg-bg-elev border border-line rounded-md px-4 py-3 pr-12 hover:border-line-strong transition-colors"
                >
                  <div className="text-[10.5px] font-mono uppercase tracking-wider text-ink-400 mb-1">
                    {isConcert ? '♪' : '⟳'}{' '}
                    {t(isConcert ? 'sessions.kindConcert' : 'sessions.kindPractice')}
                  </div>
                  <div className="font-display italic text-2xl text-ink-900 leading-tight">
                    {formatSessionDate(session.date, i18n.language)}
                  </div>
                  {session.venue !== null ? (
                    <div className="text-[12.5px] text-ink-500 mt-0.5">{session.venue}</div>
                  ) : null}
                </Link>
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setPendingDeletion(session.id);
                  }}
                  aria-label={t('sessions.delete.aria')}
                  className="absolute top-1/2 -translate-y-1/2 right-3 inline-flex items-center justify-center w-8 h-8 rounded-md text-ink-400 hover:text-danger hover:bg-bg transition-colors cursor-pointer"
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {creating !== null ? (
        <CreateSessionDialog
          kind={creating}
          open={creating !== null}
          onClose={() => setCreating(null)}
          onCreated={(sessionId) => navigate(`/sessions/${sessionId}`)}
          existingConcerts={concerts.map((concert) => ({
            id: concert.id,
            date: concert.date,
            venue: concert.venue,
          }))}
        />
      ) : null}

      <dialog
        ref={confirmDialogRef}
        onClose={() => setPendingDeletion(null)}
        className="m-auto w-[calc(100vw-2rem)] sm:w-[26rem] max-w-[26rem] rounded-lg border border-line bg-bg-elev p-0 backdrop:bg-ink-900/40"
      >
        <div className="p-4 flex flex-col gap-3">
          <p className="text-[13px] text-ink-700 m-0">{t('sessions.delete.confirm')}</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setPendingDeletion(null)}>
              {t('common.cancel')}
            </Button>
            <Button type="button" variant="danger" onClick={confirmDelete}>
              {t('sessions.delete.button')}
            </Button>
          </div>
        </div>
      </dialog>
    </section>
  );
}
