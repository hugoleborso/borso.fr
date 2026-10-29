/** @Feature sessions */

import { orderSessionsForListing } from '@domain/session-schedule.core';
import { type JSX, useMemo, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/atoms/Button';
import { ButtonLink } from '../../components/atoms/ButtonLink';
import { Chip } from '../../components/atoms/Chip';
import { Icon } from '../../components/atoms/Icon';
import { IconButton } from '../../components/atoms/IconButton';
import { composeClassName } from '../../components/atoms/class-name.utils';
import { BottomActions } from '../../components/atoms/BottomActions';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { CreateSessionDialog } from '../../components/organisms/CreateSessionDialog';
import { PageHeader } from '../../components/molecules/PageHeader';
import { SessionsSectionTabs } from '../../components/molecules/SessionsSectionTabs';
import { getCurrentTime, readServerTime, subscribeClock } from '../../clock.store';
import { ApiError } from '../../lib/api.client';
import { formatSessionDate } from '../../lib/formatters.utils';
import { useNavigateTo } from '../../lib/navigation.hook';
import { useDeleteSession, useSessionsList } from '../../lib/queries/sessions.queries';

const NO_ROWS: readonly never[] = [];
const KIND_PARAM = 'kind';
const CONCERT_KIND = 'concert';

interface SessionDraft {
  readonly kind: 'concert' | 'practice';
}

// @FollowsBlueprint route-list-page
export function SessionsPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const navigateTo = useNavigateTo();
  const sessionsQuery = useSessionsList();
  const deleteSession = useDeleteSession();

  const [creating, setCreating] = useState<SessionDraft | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const isConcertsOnly = searchParams.get(KIND_PARAM) === CONCERT_KIND;

  const nowEpochMs = useSyncExternalStore(subscribeClock, getCurrentTime, readServerTime);
  const sessions = useMemo(
    () => orderSessionsForListing(sessionsQuery.data?.sessions ?? NO_ROWS, new Date(nowEpochMs)),
    [sessionsQuery.data, nowEpochMs],
  );
  const concerts = sessions.filter((session) => session.kind === CONCERT_KIND);
  const listedSessions = isConcertsOnly ? concerts : sessions;
  const toggleConcertsOnly = (): void => {
    setSearchParams(isConcertsOnly ? {} : { [KIND_PARAM]: CONCERT_KIND }, { replace: true });
  };
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
    <section className="px-4 sm:px-9 py-4 sm:py-7 pb-20 max-w-[1280px]">
      <PageHeader
        title={t('sessions.title')}
        actions={
          <ButtonLink to="/sessions/slots" variant="secondary" size="sm" icon="calendar">
            {t('freeSlots.open')}
          </ButtonLink>
        }
      >
        <SessionsSectionTabs value="sessions" />
        <div className="mt-3">
          <Chip pressed={isConcertsOnly} onPress={toggleConcertsOnly}>
            <Icon name="audience" />
            <span>{t('sessions.concertsOnly')}</span>
          </Chip>
        </div>
      </PageHeader>

      {error === null ? null : (
        <p className="text-danger text-meta mb-3" role="alert">
          {error}
        </p>
      )}
      {sessionsQuery.isLoading ? (
        <p className="text-ink-soft italic text-meta">{t('common.loading')}</p>
      ) : null}

      <ul className="relative pl-8 flex flex-col gap-1">
        <span
          className="absolute top-1 bottom-1 left-2 w-px bg-rule-strong pointer-events-none"
          aria-hidden="true"
        />
        {listedSessions.map((session) => {
          const isConcert = session.kind === CONCERT_KIND;
          return (
            <li key={session.id} className="relative py-2">
              <span
                className={composeClassName(
                  'absolute -left-7 top-3.5 w-2.5 h-2.5 rounded-full',
                  isConcert ? 'bg-accent border-2 border-accent' : 'bg-paper border-2 border-ink',
                )}
                aria-hidden="true"
              />
              <div className="relative">
                <Link
                  to={`/sessions/${session.id}`}
                  className={composeClassName(
                    'block rounded-md px-4 py-3 pr-12 transition-colors',
                    isConcert
                      ? 'border-2 border-accent bg-accent-soft'
                      : 'border border-rule bg-leaf hover:border-rule-strong',
                  )}
                >
                  <div
                    className={composeClassName(
                      'text-label uppercase tracking-wider mb-1',
                      isConcert ? 'font-semibold text-accent-strong' : 'text-ink-soft',
                    )}
                  >
                    {isConcert ? '♪' : '⟳'}{' '}
                    {t(isConcert ? 'sessions.kindConcert' : 'sessions.kindPractice')}
                  </div>
                  <div className="font-display text-title text-ink leading-tight">
                    {formatSessionDate(session.date, i18n.language)}
                  </div>
                  {session.venue === null ? null : (
                    <div className="text-meta text-ink-soft mt-0.5">{session.venue}</div>
                  )}
                </Link>
                <IconButton
                  icon="trash"
                  variant="danger"
                  label={t('sessions.delete.aria')}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setPendingDeletion(session.id);
                  }}
                  className="absolute top-1/2 right-3 -translate-y-1/2"
                />
              </div>
            </li>
          );
        })}
      </ul>

      {creating === null ? null : (
        <CreateSessionDialog
          kind={creating.kind}
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
      <BottomActions>
        <Button variant="secondary" onClick={() => setCreating({ kind: 'practice' })} icon="plus">
          {t('sessions.kindPractice')}
        </Button>
        <Button variant="primary" onClick={() => setCreating({ kind: 'concert' })} icon="plus">
          {t('sessions.kindConcert')}
        </Button>
      </BottomActions>
    </section>
  );
}
