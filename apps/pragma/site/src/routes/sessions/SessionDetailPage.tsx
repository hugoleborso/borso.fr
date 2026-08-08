/**
 * Session detail — read-only display by default. Mirrors the
 * prototype's `ConcertDetail` (sessions.jsx lines 108-202) and
 * `PracticeDetail` (lines 222-277). The concert read view + practice
 * read view live in sibling files so this page stays a thin
 * orchestrator: data fetch, edit-mode toggle, setlist mount.
 *
 * Reads via useSession, useMembersList, useSessionsList,
 * useSetlistBySession. Writes via useUpdateSession + useCreateSetlist.
 */

import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../../components/atoms/Button';
import { Icon } from '../../components/atoms/Icon';
import { ApiError } from '../../lib/api';
import { formatSessionDate } from '../../lib/formatters.utils';
import { useMembersList } from '../../lib/queries/members';
import { useSession, useSessionsList, useUpdateSession } from '../../lib/queries/sessions';
import { useCreateSetlist, useSetlistBySession } from '../../lib/queries/setlists';
import { SetlistEditor } from '../setlists/SetlistEditor';
import { ConcertEditForm, type ConcertEditFormPayload } from './ConcertEditForm';
import { ConcertReadView } from './ConcertReadView';
import { parseFriendsCounts } from './friends-count.core';
import { PracticeReadView } from './PracticeReadView';

const NO_ROWS: readonly never[] = [];

export function SessionDetailPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { sessionId } = useParams<{ sessionId: string }>();
  const sessionQuery = useSession(sessionId ?? '', sessionId !== undefined);
  const membersQuery = useMembersList();
  const sessionsQuery = useSessionsList();
  const setlistQuery = useSetlistBySession(sessionId ?? '', sessionId !== undefined);
  const updateSession = useUpdateSession();
  const createSetlist = useCreateSetlist();

  const [editingConcert, setEditingConcert] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const session = sessionQuery.data?.session ?? null;
  const members = membersQuery.data?.members ?? NO_ROWS;
  const sessions = useMemo(() => sessionsQuery.data?.sessions ?? NO_ROWS, [sessionsQuery.data]);
  const setlist = setlistQuery.data?.setlist ?? null;

  const concertFormInitial = useMemo<ConcertEditFormPayload>(
    () => ({
      venue: session?.venue ?? '',
      capacity: session?.capacity === null || session === null ? '' : String(session.capacity),
      gear: session?.gear ?? '',
      friends: session === null ? {} : parseFriendsCounts(session.friendsCountPerMember),
    }),
    [session],
  );

  const upcomingConcerts = useMemo(() => {
    const now = Date.now();
    return sessions.filter(
      (entry) => entry.kind === 'concert' && new Date(entry.date).getTime() > now,
    );
  }, [sessions]);

  const preparedConcert = useMemo(() => {
    if (session === null || session.preparedConcertId === null) return null;
    return upcomingConcerts.find((entry) => entry.id === session.preparedConcertId) ?? null;
  }, [session, upcomingConcerts]);

  const friendsCounts = useMemo(
    () => (session === null ? {} : parseFriendsCounts(session.friendsCountPerMember)),
    [session],
  );

  const friendsTotal = useMemo(
    () => Object.values(friendsCounts).reduce((accumulator, value) => accumulator + value, 0),
    [friendsCounts],
  );

  const buildSetlist = (): void => {
    if (sessionId === undefined) return;
    createSetlist.mutate({ sessionId });
  };

  const saveConcertDetails = (payload: ConcertEditFormPayload): void => {
    if (session === null || session.kind !== 'concert') return;
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
    if (session === null || session.kind !== 'practice') return;
    updateSession.mutate({ id: session.id, preparedConcertId: concertId });
  };

  const isLoading = sessionQuery.isLoading || membersQuery.isLoading || sessionsQuery.isLoading;

  if (isLoading) {
    return <p className="px-4 sm:px-9 py-7 text-ink-400 italic text-sm">{t('common.loading')}</p>;
  }
  const queryError = sessionQuery.error instanceof ApiError ? sessionQuery.error.message : null;
  if (session === null) {
    return (
      <p className="px-4 sm:px-9 py-7 text-danger text-sm" role="alert">
        {localError ?? queryError ?? 'not found'}
      </p>
    );
  }

  const isConcert = session.kind === 'concert';
  const formattedDate = formatSessionDate(session.date, i18n.language);
  const titleText = isConcert ? (session.venue ?? formattedDate) : t('sessions.kindPractice');
  const displayError = localError ?? queryError;

  return (
    <section className="px-4 sm:px-9 py-7 pb-20 max-w-[1280px] flex flex-col gap-5">
      <Link
        to="/sessions"
        className="inline-flex items-center gap-1.5 text-xs text-ink-500 hover:text-ink-900 transition-colors no-underline"
      >
        <Icon name="chevL" size={14} />
        {t('common.back')}
      </Link>

      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="text-[11px] tracking-wider uppercase text-ink-500 mb-1">
            {t(isConcert ? 'sessions.kindConcert' : 'sessions.kindPractice')}
          </div>
          <h1 className="font-display italic text-[40px] sm:text-[56px] leading-[0.95] tracking-[-0.015em] text-ink-900 m-0 mb-2">
            {titleText}
          </h1>
          <div className="flex items-center gap-2.5 text-[13px] text-ink-500 flex-wrap">
            <span>{formattedDate}</span>
            {isConcert && session.capacity !== null ? (
              <>
                <span className="text-ink-300">·</span>
                <span>
                  {t('sessions.capacity')} {session.capacity}
                </span>
              </>
            ) : null}
            {isConcert && friendsTotal > 0 ? (
              <>
                <span className="text-ink-300">·</span>
                <span>
                  {friendsTotal} {t('sessions.friendsCount').toLowerCase()}
                </span>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isConcert && !editingConcert ? (
            <Button variant="default" onClick={() => setEditingConcert(true)}>
              <Icon name="edit" size={14} />
              {t('common.edit')}
            </Button>
          ) : null}
          {setlist === null ? null : (
            <Link to="/setlists">
              <Button variant="accent" type="button">
                <Icon name="setlist" size={14} />
                {t('sessions.setlist')}
              </Button>
            </Link>
          )}
        </div>
      </header>

      {displayError === null ? null : (
        <p className="text-danger text-sm" role="alert">
          {displayError}
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
        {t('sessions.setlist')}
      </h3>
      {setlist === null ? (
        <div>
          <Button variant="accent" onClick={buildSetlist}>
            <Icon name="plus" size={14} />
            {t('sessions.buildSetlist')}
          </Button>
        </div>
      ) : (
        <SetlistEditor setlistId={setlist.id} />
      )}
    </section>
  );
}
