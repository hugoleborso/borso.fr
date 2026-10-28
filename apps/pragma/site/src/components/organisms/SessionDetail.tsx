/** @Feature sessions */

import { selectUpcomingConcerts } from '@domain/upcoming-concerts.core';
import { type JSX, useMemo, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrentTime, readServerTime, subscribeClock } from '../../clock.store';
import { ApiError } from '../../lib/api.client';
import { formatSessionDate } from '../../lib/formatters.utils';
import { useNavigateTo } from '../../lib/navigation.hook';
import type { ListedMember } from '../../lib/queries/members.queries';
import {
  type ListedSession,
  type SessionRecord,
  useUpdateSession,
} from '../../lib/queries/sessions.queries';
import { type SetlistSummary, useCreateSetlist } from '../../lib/queries/setlists.queries';
import { useSongsList } from '../../lib/queries/songs.queries';
import { useSessionLabel } from '../../lib/session-label.hook';
import { parseFriendsCounts } from '../../routes/sessions/friends-count.core';
import { isPracticeModeOffered } from '../../routes/sessions/practice-mode.core';
import { selectSessionFacts } from '../../routes/sessions/session-facts.core';
import {
  isPreparedConcertPickerShown,
  selectSessionPills,
} from '../../routes/sessions/session-page.core';
import { BottomActions } from '../atoms/BottomActions';
import { Button } from '../atoms/Button';
import { ButtonLink } from '../atoms/ButtonLink';
import { BackLink } from '../molecules/BackLink';
import { PageHeader } from '../molecules/PageHeader';
import { PracticeReadView } from '../molecules/PracticeReadView';
import { AttachSetlistDialog } from './AttachSetlistDialog';
import { ConcertEditForm, type ConcertEditFormPayload } from './ConcertEditForm';
import { ConcertReadView } from './ConcertReadView';
import { SessionSetlistPreviews } from './SessionSetlistPreviews';
import { SessionTakes } from './SessionTakes';
import { SessionTasks } from './SessionTasks';
import { SetlistSongPicker } from './SetlistSongPicker';
import { recordProductEvent } from '../../observability/product-event.adapter';

export interface SessionDetailProps {
  readonly session: SessionRecord;
  readonly members: readonly ListedMember[];
  readonly sessions: readonly ListedSession[];
  readonly setlists: readonly SetlistSummary[];
  readonly isSetlistsLoading: boolean;
}

interface CreatedSetlist {
  readonly id: string;
  readonly name: string;
}

type SetlistChooser = 'closed' | 'attach' | 'add';

const CHOOSER_OPENNESS: Readonly<Record<SetlistChooser, boolean>> = {
  closed: false,
  attach: true,
  add: true,
};
const DOES_CHOOSER_OFFER_NEW: Readonly<Record<SetlistChooser, boolean>> = {
  closed: false,
  attach: false,
  add: true,
};

const NO_ROWS: readonly never[] = [];
const NO_SONG_IDS: readonly string[] = [];

// @FollowsBlueprint organism-query-owning
export function SessionDetail(props: SessionDetailProps): JSX.Element {
  const { session, members, sessions, setlists } = props;
  const { t, i18n } = useTranslation();
  const navigateTo = useNavigateTo();
  const labelOf = useSessionLabel();
  const updateSession = useUpdateSession();
  const createSetlist = useCreateSetlist();
  const songsQuery = useSongsList();
  const nowEpochMs = useSyncExternalStore(subscribeClock, getCurrentTime, readServerTime);
  const [editingConcert, setEditingConcert] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [setlistChooser, setSetlistChooser] = useState<SetlistChooser>('closed');
  const [pickingInto, setPickingInto] = useState<CreatedSetlist | null>(null);

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
  const songCount = setlists.reduce((total, setlist) => total + setlist.songCount, 0);
  const now = new Date(nowEpochMs);
  const pills = selectSessionPills({
    isLoading: props.isSetlistsLoading,
    sessionId: session.id,
    firstSetlistId: setlists[0]?.id ?? null,
    isPracticeModeOffered: isPracticeModeOffered({
      kind: session.kind,
      date: session.date,
      songCount,
      now,
    }),
  });
  const isPickerShown = isPreparedConcertPickerShown({
    sessionDate: session.date,
    preparedConcertId: session.preparedConcertId ?? null,
    now,
  });

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

  const sessionLabel = labelOf(session);
  const addSongsToNewSetlist = (): void => {
    createSetlist.mutate(
      { name: sessionLabel, sessionId: session.id },
      {
        onSuccess: (created) =>
          setPickingInto({ id: created.setlist.id, name: created.setlist.name }),
        onError: () => setLocalError(t('setlist.failure.create')),
      },
    );
  };

  const isSetlistChooserOpen = CHOOSER_OPENNESS[setlistChooser];
  const offersNewSetlist = DOES_CHOOSER_OFFER_NEW[setlistChooser];
  const createSetlistFromChooser = (): void => {
    setSetlistChooser('closed');
    addSongsToNewSetlist();
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
    <section className="flex max-w-[1280px] flex-col gap-5 px-4 py-4 sm:px-9 sm:py-7">
      <BackLink to="/sessions" label={t('sessions.title')} />

      <PageHeader
        crumb={t(isConcert ? 'sessions.kindConcert' : 'sessions.kindPractice')}
        title={titleText}
        subtitle={[formattedDate, ...sessionFacts].join(' · ')}
        className="mb-0 sm:mb-0"
        actions={
          isConcert && !editingConcert ? (
            <>
              <ButtonLink
                variant="secondary"
                icon="audience"
                to={`/sessions/${session.id}/audience`}
              >
                {t('audience.panelTitle')}
              </ButtonLink>
              <Button variant="secondary" onClick={() => setEditingConcert(true)} icon="edit">
                {t('common.edit')}
              </Button>
            </>
          ) : null
        }
      />

      {localError === null ? null : (
        <p className="m-0 text-meta text-danger" role="alert">
          {localError}
        </p>
      )}
      <SessionSetlistPreviews
        sessionId={session.id}
        setlists={setlists}
        isLoading={props.isSetlistsLoading}
        isEmpty={pills.isAddSetlistShown}
        onAddSetlist={() => setSetlistChooser('add')}
        onAttachSetlist={() => setSetlistChooser('attach')}
      />

      <SessionTasks sessionId={session.id} />
      <SessionTakes sessionId={session.id} />

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
      ) : null}
      {!isConcert && isPickerShown ? (
        <PracticeReadView
          session={session}
          preparedConcert={preparedConcert}
          upcomingConcerts={upcomingConcerts}
          onChangePreparedConcert={setPreparedConcert}
          language={i18n.language}
        />
      ) : null}

      {isSetlistChooserOpen ? (
        <AttachSetlistDialog
          sessionId={session.id}
          onClose={() => setSetlistChooser('closed')}
          onCreateNew={offersNewSetlist ? createSetlistFromChooser : null}
        />
      ) : null}
      <SetlistSongPicker
        open={pickingInto !== null}
        setlistId={pickingInto?.id ?? ''}
        setlistName={pickingInto?.name ?? ''}
        songs={songsQuery.data?.songs ?? NO_ROWS}
        setlistSongIds={NO_SONG_IDS}
        onClose={() => setPickingInto(null)}
        onAdded={() => navigateTo(`/setlists/${pickingInto?.id ?? ''}`)}
      />

      <BottomActions>
        {pills.setlistPath === null ? null : (
          <ButtonLink icon="arrowR" variant={pills.setlistVariant} to={pills.setlistPath}>
            {t(pills.setlistLabelKey)}
          </ButtonLink>
        )}
        {pills.practicePath === null ? null : (
          <ButtonLink
            icon="play"
            variant="primary"
            to={pills.practicePath}
            onClick={() => recordProductEvent('practice_mode_started')}
          >
            {t('practice.start')}
          </ButtonLink>
        )}
        {pills.isAddSetlistShown ? (
          <Button
            icon="plus"
            variant="primary"
            disabled={createSetlist.isPending}
            onClick={addSongsToNewSetlist}
          >
            {t('sessions.addSetlist')}
          </Button>
        ) : null}
      </BottomActions>
    </section>
  );
}
