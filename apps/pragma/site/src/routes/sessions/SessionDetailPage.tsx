/** @Feature sessions */

import type { JSX } from 'react';
import { useMemo, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Button } from '../../components/atoms/Button';
import { Icon } from '../../components/atoms/Icon';
import { getCurrentTime, readServerTime, subscribeClock } from '../../clock.store';
import { ApiError } from '../../lib/api.client';
import { selectUpcomingConcerts } from '../../lib/upcoming-concerts.core';
import { formatSessionDate } from '../../lib/formatters.utils';
import { useMembersList } from '../../lib/queries/members.queries';
import { useSession, useSessionsList, useUpdateSession } from '../../lib/queries/sessions.queries';
import { useSetlistsBySession } from '../../lib/queries/setlists.queries';
import { BackLink } from '../../components/molecules/BackLink';
import { NotFoundNotice } from '../../components/molecules/NotFoundNotice';
import { PageHeader } from '../../components/molecules/PageHeader';
import {
  ConcertEditForm,
  type ConcertEditFormPayload,
} from '../../components/organisms/ConcertEditForm';
import { ConcertReadView } from '../../components/organisms/ConcertReadView';
import { SessionSetlists } from '../../components/organisms/SessionSetlists';
import { VotingRoundPanel } from '../../components/organisms/VotingRoundPanel';
import { parseFriendsCounts } from './friends-count.core';
import { selectMissingSessionMessageKey } from './missing-session.core';
import { selectSessionFacts } from './session-facts.core';
import { PracticeReadView } from '../../components/molecules/PracticeReadView';

const NO_ROWS: readonly never[] = [];

/**
 * @Blueprint route-detail-page
 * @BlueprintName Route Detail Page
 * @BlueprintUsage Use for a route that reads one record named by a route parameter.
 * @BlueprintDescription Reads the identifier with `useParams`, passes it to the id scoped query hooks together with an enabled flag so no request fires for an absent parameter, and returns early for the loading and the missing record cases before any markup that assumes the record exists. Everything after the early returns is a read organism taking plain props, so the page stays a thin orchestrator over the query hooks.
 */
export function SessionDetailPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { sessionId } = useParams<{ sessionId: string }>();
  const sessionQuery = useSession(sessionId ?? '', sessionId !== undefined);
  const membersQuery = useMembersList();
  const sessionsQuery = useSessionsList();
  const setlistsQuery = useSetlistsBySession(sessionId ?? '', sessionId !== undefined);
  const updateSession = useUpdateSession();

  const nowEpochMs = useSyncExternalStore(subscribeClock, getCurrentTime, readServerTime);
  const [editingConcert, setEditingConcert] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const session = sessionQuery.data?.session ?? null;
  const members = membersQuery.data?.members ?? NO_ROWS;
  const sessions = useMemo(() => sessionsQuery.data?.sessions ?? NO_ROWS, [sessionsQuery.data]);
  const setlists = setlistsQuery.data?.setlists ?? NO_ROWS;

  const concertFormInitial = useMemo<ConcertEditFormPayload>(
    () => ({
      venue: session?.venue ?? '',
      capacity: session?.capacity === null || session === null ? '' : String(session.capacity),
      gear: session?.gear ?? '',
      friends: session === null ? {} : parseFriendsCounts(session.friendsCountPerMember),
    }),
    [session],
  );

  const upcomingConcerts = useMemo(
    () => selectUpcomingConcerts(sessions, nowEpochMs),
    [sessions, nowEpochMs],
  );

  const preparedConcert = useMemo(() => {
    const preparedConcertId = session?.preparedConcertId ?? null;
    if (preparedConcertId === null) return null;
    return upcomingConcerts.find((entry) => entry.id === preparedConcertId) ?? null;
  }, [session, upcomingConcerts]);

  const friendsCounts = useMemo(
    () => (session === null ? {} : parseFriendsCounts(session.friendsCountPerMember)),
    [session],
  );

  const friendsTotal = useMemo(
    () => Object.values(friendsCounts).reduce((accumulator, value) => accumulator + value, 0),
    [friendsCounts],
  );

  const saveConcertDetails = (payload: ConcertEditFormPayload): void => {
    if (session?.kind !== 'concert') return;
    const trimmedVenue = payload.venue.trim();
    const trimmedCapacity = payload.capacity.trim();
    updateSession.mutate(
      {
        id: session.id,
        ...(trimmedVenue.length > 0 ? { venue: trimmedVenue } : {}),
        ...(trimmedCapacity.length > 0 ? { capacity: Number(trimmedCapacity) } : {}),
        gear: payload.gear,
        friendsCountPerMember: payload.friends,
      },
      {
        onSuccess: () => setEditingConcert(false),
        onError: (error) =>
          setLocalError(error instanceof ApiError ? error.message : 'unknown-error'),
      },
    );
  };

  const setPreparedConcert = (concertId: string | null): void => {
    if (session?.kind !== 'practice') return;
    updateSession.mutate({ id: session.id, preparedConcertId: concertId });
  };

  const isLoading = sessionQuery.isLoading || membersQuery.isLoading || sessionsQuery.isLoading;

  if (isLoading) {
    return <p className="px-4 sm:px-9 py-7 text-ink-400 italic text-sm">{t('common.loading')}</p>;
  }
  if (session === null) {
    return (
      <NotFoundNotice
        message={t(selectMissingSessionMessageKey(sessionQuery.error))}
        backTo="/sessions"
        backLabel={t('sessions.title')}
      />
    );
  }

  const isConcert = session.kind === 'concert';
  const formattedDate = formatSessionDate(session.date, i18n.language);
  const sessionFacts = selectSessionFacts({
    isConcert,
    capacity: session.capacity,
    guestCount: friendsTotal,
    capacityLabel: t('sessions.capacity'),
    guestsLabel: t('sessions.friendsCount').toLowerCase(),
  });
  const titleText = isConcert ? (session.venue ?? formattedDate) : t('sessions.kindPractice');

  return (
    <section className="px-4 sm:px-9 py-7 pb-20 max-w-[1280px] flex flex-col gap-5">
      <BackLink to="/sessions" label={t('common.back')} />

      <PageHeader
        crumb={t(isConcert ? 'sessions.kindConcert' : 'sessions.kindPractice')}
        title={titleText}
        subtitle={[formattedDate, ...sessionFacts].join(' · ')}
        actions={
          isConcert && !editingConcert ? (
            <Button variant="default" onClick={() => setEditingConcert(true)}>
              <Icon name="edit" size={14} />
              {t('common.edit')}
            </Button>
          ) : null
        }
      />

      {localError === null ? null : (
        <p className="text-danger text-sm" role="alert">
          {localError}
        </p>
      )}

      {isConcert ? (
        editingConcert ? (
          <ConcertEditForm
            key={session.id}
            members={members}
            initial={concertFormInitial}
            onSubmit={saveConcertDetails}
            onCancel={() => setEditingConcert(false)}
          />
        ) : (
          <ConcertReadView
            venue={session.venue}
            capacity={session.capacity}
            gear={session.gear}
            friendsCounts={friendsCounts}
            members={members}
            friendsTotal={friendsTotal}
          />
        )
      ) : (
        <PracticeReadView
          session={session}
          preparedConcert={preparedConcert}
          upcomingConcerts={upcomingConcerts}
          onChangePreparedConcert={setPreparedConcert}
          language={i18n.language}
        />
      )}

      <h3 className="font-display italic text-2xl text-ink-900 m-0 mt-4">
        {t('sessions.setlists')}
      </h3>
      <SessionSetlists
        sessionId={session.id}
        setlists={setlists}
        isLoading={setlistsQuery.isLoading}
      />

      {isConcert ? <VotingRoundPanel sessionId={session.id} /> : null}
    </section>
  );
}
