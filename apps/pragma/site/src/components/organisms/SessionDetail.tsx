/** @Feature sessions */

import { selectUpcomingConcerts } from '@domain/upcoming-concerts.core';
import { type JSX, useMemo, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
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
  listSessionViews,
  readSessionView,
  SESSION_VIEW_PARAM,
  type SessionView,
  selectSessionPills,
} from '../../routes/sessions/session-page.core';
import { Button } from '../atoms/Button';
import { ButtonLink } from '../atoms/ButtonLink';
import { PageHeader } from '../molecules/PageHeader';
import { PracticeReadView } from '../molecules/PracticeReadView';
import { SessionPrimaryActions } from '../molecules/SessionPrimaryActions';
import { SessionViewTabs } from '../molecules/SessionViewTabs';
import { AttachSetlistDialog } from './AttachSetlistDialog';
import { PracticeSongList } from './PracticeSongList';
import { PracticeSongsSheet } from './PracticeSongsSheet';
import { usePracticeSongs } from './practice-songs.hook';
import { ConcertEditForm, type ConcertEditFormPayload } from './ConcertEditForm';
import { ConcertReadView } from './ConcertReadView';
import { SessionSetlistPreviews } from './SessionSetlistPreviews';
import { SessionTakes } from './SessionTakes';
import { SessionTasks } from './SessionTasks';
import { SetlistSongPicker } from './SetlistSongPicker';

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
  const [isChoosingSongs, setIsChoosingSongs] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

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
  const friendsTotal = useMemo(
    () => Object.values(friendsCounts).reduce((accumulator, value) => accumulator + value, 0),
    [friendsCounts],
  );
  const isPractice = session.kind === 'practice';
  const songs = songsQuery.data?.songs ?? NO_ROWS;
  const practiceSongs = usePracticeSongs(isPractice, setlists, songs);
  const songCount = setlists.reduce((total, setlist) => total + setlist.songCount, 0);
  const now = new Date(nowEpochMs);
  const isPickerShown = isPreparedConcertPickerShown({
    sessionDate: session.date,
    preparedConcertId: session.preparedConcertId ?? null,
    now,
  });

  const isConcert = session.kind === 'concert';
  const views = listSessionViews({ hasDetails: isConcert || isPickerShown, isPractice });
  const view = readSessionView(searchParams.get(SESSION_VIEW_PARAM), views);
  const showView = (nextView: SessionView): void => {
    setSearchParams({ [SESSION_VIEW_PARAM]: nextView }, { replace: true });
  };
  const pills = selectSessionPills({
    isLoading: props.isSetlistsLoading || practiceSongs.isLoading,
    isPractice,
    sessionId: session.id,
    firstSetlistId: setlists[0]?.id ?? null,
    isPracticeModeOffered: isPracticeModeOffered({
      kind: session.kind,
      date: session.date,
      songCount,
      now,
    }),
    view,
  });

  const editConcert = (): void => {
    setEditingConcert(true);
    showView('details');
  };

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

  const formattedDate = formatSessionDate(session.date, i18n.language);
  const sessionFacts = selectSessionFacts({
    isConcert,
    capacity: session.capacity,
    guestCount: friendsTotal,
    capacityLabel: t('sessions.capacity'),
    guestsLabel: t('sessions.friendsCount').toLowerCase(),
  });
  const titleText = isConcert ? (session.venue ?? formattedDate) : t('sessions.kindPractice');

  const detailsPanel = isConcert ? (
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
  ) : isPickerShown ? (
    <PracticeReadView
      session={session}
      upcomingConcerts={upcomingConcerts}
      onChangePreparedConcert={setPreparedConcert}
      language={i18n.language}
    />
  ) : null;
  const panelByView: Readonly<Record<SessionView, JSX.Element | null>> = {
    setlist: (
      <SessionSetlistPreviews
        sessionId={session.id}
        setlists={setlists}
        isLoading={props.isSetlistsLoading}
        isEmpty={pills.isAddSetlistShown}
        onAddSetlist={() => setSetlistChooser('add')}
        onAttachSetlist={() => setSetlistChooser('attach')}
      />
    ),
    songs: (
      <PracticeSongList
        songs={practiceSongs.songs}
        isLoading={props.isSetlistsLoading || practiceSongs.isLoading}
      />
    ),
    tasks: <SessionTasks sessionId={session.id} />,
    takes: <SessionTakes sessionId={session.id} />,
    details: detailsPanel,
  };

  return (
    <section className="flex max-w-[960px] flex-col gap-5 px-4 py-4 sm:px-9 sm:py-7">
      <PageHeader
        back={{ to: '/sessions', label: t('sessions.title') }}
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
              <Button variant="secondary" onClick={editConcert} icon="edit">
                {t('common.edit')}
              </Button>
            </>
          ) : null
        }
      >
        <SessionViewTabs views={views} value={view} onChange={showView} />
      </PageHeader>

      {localError === null ? null : (
        <p className="m-0 text-meta text-danger" role="alert">
          {localError}
        </p>
      )}
      {panelByView[view]}

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
        songs={songs}
        setlistSongIds={NO_SONG_IDS}
        onClose={() => setPickingInto(null)}
        onAdded={() => navigateTo(`/setlists/${pickingInto?.id ?? ''}`)}
      />

      {isChoosingSongs ? (
        <PracticeSongsSheet
          practice={session}
          setlistName={sessionLabel}
          sessions={sessions}
          practiceSetlists={setlists}
          practiceSongs={practiceSongs}
          onClose={() => setIsChoosingSongs(false)}
        />
      ) : null}
      <SessionPrimaryActions
        pills={pills}
        isAddingSetlist={createSetlist.isPending}
        onAddSetlist={addSongsToNewSetlist}
        onChooseSongs={() => setIsChoosingSongs(true)}
      />
    </section>
  );
}
