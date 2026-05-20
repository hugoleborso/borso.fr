/**
 * Session detail — read-only display by default. Mirrors the
 * prototype's `ConcertDetail` (sessions.jsx lines 108-202) and
 * `PracticeDetail` (lines 222-277). The concert read view + practice
 * read view live in sibling files so this page stays a thin
 * orchestrator: data fetch, edit-mode toggle, setlist mount.
 *
 * Concert: venue as H1, date + capacity + total-friends in the
 * sub-line, friends-per-member bars on the left, gear card + venue
 * panel on the right. The "Edit" button opens ConcertEditForm
 * (existing) in place.
 *
 * Practice: prepared-concert link as the focal piece (with the
 * existing dropdown affordance to pick or change the concert).
 *
 * Setlist editor mounts below the detail block when a setlist exists,
 * with a "Build setlist" CTA when it doesn't.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../../components/atoms/Button';
import { Icon } from '../../components/atoms/Icon';
import { ApiError, apiRequest } from '../../lib/api-client';
import { formatSessionDate } from '../../lib/formatters.utils';
import { SetlistEditor } from '../setlists/SetlistEditor';
import { ConcertEditForm } from './ConcertEditForm';
import { ConcertReadView } from './ConcertReadView';
import { PracticeReadView } from './PracticeReadView';

const friendsCountShape = z.record(z.string().uuid(), z.number());

const sessionSchema = z.object({
  id: z.string().uuid(),
  kind: z.string(),
  date: z.string(),
  preparedConcertId: z.string().nullable(),
  venue: z.string().nullable(),
  capacity: z.number().nullable(),
  gear: z.string().nullable(),
  friendsCountPerMember: friendsCountShape.nullable().or(z.null()),
});
const singleSessionSchema = z.object({ session: sessionSchema });
const sessionListSchema = z.object({ sessions: z.array(sessionSchema) });

const memberSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  color: z.string(),
});
const memberListSchema = z.object({ members: z.array(memberSchema) });

const setlistSchema = z.object({ id: z.string().uuid(), sessionId: z.string().uuid() });
const singleSetlistSchema = z.object({ setlist: setlistSchema });

type Session = z.infer<typeof sessionSchema>;
type Member = z.infer<typeof memberSchema>;
type Setlist = z.infer<typeof setlistSchema>;

function parseFriendsCounts(raw: unknown): Record<string, number> {
  const parsed = friendsCountShape.safeParse(raw);
  if (!parsed.success) return {};
  return parsed.data;
}

export function SessionDetailPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [upcomingConcerts, setUpcomingConcerts] = useState<Session[]>([]);
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [editingConcert, setEditingConcert] = useState(false);
  const [venueDraft, setVenueDraft] = useState('');
  const [capacityDraft, setCapacityDraft] = useState('');
  const [gearDraft, setGearDraft] = useState('');
  const [friendsDraft, setFriendsDraft] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (): Promise<void> => {
    if (sessionId === undefined) return;
    setLoading(true);
    try {
      const [sessionBody, membersBody, sessionsBody] = await Promise.all([
        apiRequest(`/api/sessions/${sessionId}`).then((body) => singleSessionSchema.parse(body)),
        apiRequest('/api/members').then((body) => memberListSchema.parse(body)),
        apiRequest('/api/sessions').then((body) => sessionListSchema.parse(body)),
      ]);
      setSession(sessionBody.session);
      setMembers(membersBody.members);
      const now = Date.now();
      setUpcomingConcerts(
        sessionsBody.sessions.filter(
          (entry) => entry.kind === 'concert' && new Date(entry.date).getTime() > now,
        ),
      );
      setVenueDraft(sessionBody.session.venue ?? '');
      setCapacityDraft(
        sessionBody.session.capacity === null ? '' : String(sessionBody.session.capacity),
      );
      setGearDraft(sessionBody.session.gear ?? '');
      setFriendsDraft(parseFriendsCounts(sessionBody.session.friendsCountPerMember));
      try {
        const setlistBody = singleSetlistSchema.parse(
          await apiRequest(`/api/setlists/by-session/${sessionId}`),
        );
        setSetlist(setlistBody.setlist);
      } catch (caught) {
        if (caught instanceof ApiError && caught.status === 404) setSetlist(null);
        else throw caught;
      }
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'unknown-error');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const preparedConcert = useMemo(() => {
    if (session === null || session.preparedConcertId === null) return null;
    return (
      upcomingConcerts.find((entry) => entry.id === session.preparedConcertId) ??
      null
    );
  }, [session, upcomingConcerts]);

  const friendsCounts = useMemo(
    () => (session === null ? {} : parseFriendsCounts(session.friendsCountPerMember)),
    [session],
  );

  const friendsTotal = useMemo(
    () => Object.values(friendsCounts).reduce((accumulator, value) => accumulator + value, 0),
    [friendsCounts],
  );

  const buildSetlist = async (): Promise<void> => {
    if (sessionId === undefined) return;
    try {
      const created = singleSetlistSchema.parse(
        await apiRequest('/api/setlists', { method: 'POST', body: { sessionId } }),
      );
      setSetlist(created.setlist);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'unknown-error');
    }
  };

  const saveConcertDetails = async (): Promise<void> => {
    if (session === null || session.kind !== 'concert') return;
    try {
      const payload = {
        venue: venueDraft.trim().length === 0 ? null : venueDraft.trim(),
        capacity: capacityDraft.trim().length === 0 ? null : Number(capacityDraft),
        gear: gearDraft,
        friendsCountPerMember: friendsDraft,
      };
      const updated = singleSessionSchema.parse(
        await apiRequest(`/api/sessions/${session.id}`, { method: 'PUT', body: payload }),
      );
      setSession(updated.session);
      setEditingConcert(false);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'unknown-error');
    }
  };

  const setPreparedConcert = async (concertId: string | null): Promise<void> => {
    if (session === null || session.kind !== 'practice') return;
    try {
      const updated = singleSessionSchema.parse(
        await apiRequest(`/api/sessions/${session.id}`, {
          method: 'PUT',
          body: { preparedConcertId: concertId },
        }),
      );
      setSession(updated.session);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'unknown-error');
    }
  };

  if (loading) {
    return (
      <p className="px-9 py-7 text-ink-400 italic text-sm">{t('common.loading')}</p>
    );
  }
  if (session === null) {
    return (
      <p className="px-9 py-7 text-danger text-sm" role="alert">
        {error ?? 'not found'}
      </p>
    );
  }

  const isConcert = session.kind === 'concert';
  const formattedDate = formatSessionDate(session.date, i18n.language);
  const titleText = isConcert ? session.venue ?? formattedDate : t('sessions.kindPractice');

  return (
    <section className="px-9 py-7 pb-20 max-w-[1280px] flex flex-col gap-5">
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
          <h1 className="font-display italic text-[56px] leading-[0.95] tracking-[-0.015em] text-ink-900 m-0 mb-2">
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
          {setlist !== null ? (
            <Link to="/setlists">
              <Button variant="accent" type="button">
                <Icon name="setlist" size={14} />
                {t('sessions.setlist')}
              </Button>
            </Link>
          ) : null}
        </div>
      </header>

      {error !== null ? (
        <p className="text-danger text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {isConcert ? (
        editingConcert ? (
          <ConcertEditForm
            members={members}
            venueDraft={venueDraft}
            capacityDraft={capacityDraft}
            gearDraft={gearDraft}
            friendsDraft={friendsDraft}
            onVenueChange={setVenueDraft}
            onCapacityChange={setCapacityDraft}
            onGearChange={setGearDraft}
            onFriendsChange={setFriendsDraft}
            onSubmit={() => void saveConcertDetails()}
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
          onChangePreparedConcert={(id) => void setPreparedConcert(id)}
          language={i18n.language}
        />
      )}

      <h3 className="font-display italic text-2xl text-ink-900 m-0 mt-4">
        {t('sessions.setlist')}
      </h3>
      {setlist === null ? (
        <div>
          <Button variant="accent" onClick={() => void buildSetlist()}>
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
