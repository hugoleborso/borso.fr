/** @Feature sessions */

import { selectUpcomingConcerts } from '@domain/upcoming-concerts.core';
import { type JSX, useMemo, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrentTime, readServerTime, subscribeClock } from '../../clock.store';
import { ApiError } from '../../lib/api.client';
import { formatSessionDate } from '../../lib/formatters.utils';
import type { ListedMember } from '../../lib/queries/members.queries';
import {
  type ListedSession,
  type SessionRecord,
  useUpdateSession,
} from '../../lib/queries/sessions.queries';
import type { SetlistSummary } from '../../lib/queries/setlists.queries';
import { parseFriendsCounts } from '../../routes/sessions/friends-count.core';
import { selectSessionFacts } from '../../routes/sessions/session-facts.core';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { BackLink } from '../molecules/BackLink';
import { PageHeader } from '../molecules/PageHeader';
import { PracticeReadView } from '../molecules/PracticeReadView';
import { ConcertEditForm, type ConcertEditFormPayload } from './ConcertEditForm';
import { ConcertReadView } from './ConcertReadView';
import { PracticeRecordingList } from './PracticeRecordingList';
import { SessionSetlists } from './SessionSetlists';
import { VotingRoundPanel } from './VotingRoundPanel';

export interface SessionDetailProps {
  readonly session: SessionRecord;
  readonly members: readonly ListedMember[];
  readonly sessions: readonly ListedSession[];
  readonly setlists: readonly SetlistSummary[];
  readonly isSetlistsLoading: boolean;
}

// @FollowsBlueprint organism-query-owning
export function SessionDetail(props: SessionDetailProps): JSX.Element {
  const { session, members, sessions, setlists } = props;
  const { t, i18n } = useTranslation();
  const updateSession = useUpdateSession();
  const nowEpochMs = useSyncExternalStore(subscribeClock, getCurrentTime, readServerTime);
  const [editingConcert, setEditingConcert] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const friendsCounts = useMemo(() => parseFriendsCounts(session.friendsCountPerMember), [session]);
  const concertFormInitial = useMemo<ConcertEditFormPayload>(
    () => ({
      venue: session.venue ?? '',
      capacity: session.capacity === null ? '' : String(session.capacity),
      gear: session.gear ?? '',
      friends: friendsCounts,
    }),
    [session, friendsCounts],
  );
  const upcomingConcerts = useMemo(
    () => selectUpcomingConcerts(sessions, nowEpochMs),
    [sessions, nowEpochMs],
  );
  const preparedConcert = useMemo(() => {
    const preparedConcertId = session.preparedConcertId ?? null;
    if (preparedConcertId === null) return null;
    return upcomingConcerts.find((entry) => entry.id === preparedConcertId) ?? null;
  }, [session, upcomingConcerts]);
  const friendsTotal = useMemo(
    () => Object.values(friendsCounts).reduce((accumulator, value) => accumulator + value, 0),
    [friendsCounts],
  );

  const saveConcertDetails = (payload: ConcertEditFormPayload): void => {
    if (session.kind !== 'concert') return;
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
    if (session.kind !== 'practice') return;
    updateSession.mutate({ id: session.id, preparedConcertId: concertId });
  };

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
    <section className="px-4 sm:px-9 py-4 sm:py-7 pb-20 max-w-[1280px] flex flex-col gap-5">
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

      <h3 className="font-display italic text-2xl text-ink-900 m-0">{t('sessions.setlists')}</h3>
      <SessionSetlists
        sessionId={session.id}
        setlists={setlists}
        isLoading={props.isSetlistsLoading}
      />

      {isConcert ? null : <PracticeRecordingList sessionId={session.id} setlists={setlists} />}

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

      {isConcert ? <VotingRoundPanel sessionId={session.id} /> : null}
    </section>
  );
}
