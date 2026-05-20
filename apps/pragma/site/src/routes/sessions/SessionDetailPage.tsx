/**
 * Session detail. For concerts: venue / capacity / gear (free-text)
 * editable inline + friends-count-per-member grid (one row per band
 * member, integer 0..1000). For practices: a "prepared concert"
 * selector + a visible link to the concert it prepares.
 *
 * Closes V2 (concert detail surface — gear, friends-per-member,
 * inline edit of venue/capacity) and V3 (practice → concert linkage
 * UI).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { Icon } from '../../components/atoms/Icon';
import { PageHeader } from '../../components/molecules/PageHeader';
import { ApiError, apiRequest } from '../../lib/api-client';
import { formatSessionDate } from '../../lib/formatters.utils';
import { SetlistEditor } from '../setlists/SetlistEditor';
import { ConcertEditForm } from './ConcertEditForm';

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

  const renderConcertReadView = (): JSX.Element => (
    <Card className="flex flex-col gap-3">
      <dl className="grid grid-cols-[140px_1fr] gap-y-2 gap-x-4 text-sm">
        <dt className="text-[11px] tracking-wider uppercase text-ink-400 font-medium self-center">
          {t('sessions.venue')}
        </dt>
        <dd className="text-ink-900">{session.venue ?? '—'}</dd>
        <dt className="text-[11px] tracking-wider uppercase text-ink-400 font-medium self-center">
          {t('sessions.capacity')}
        </dt>
        <dd className="text-ink-900 font-mono">{session.capacity ?? '—'}</dd>
        <dt className="text-[11px] tracking-wider uppercase text-ink-400 font-medium self-center">
          {t('sessions.gear')}
        </dt>
        <dd className="text-ink-700 whitespace-pre-line">{session.gear ?? '—'}</dd>
      </dl>
      <div>
        <Button variant="default" onClick={() => setEditingConcert(true)}>
          <Icon name="edit" size={14} />
          {t('sessions.editConcertDetails')}
        </Button>
      </div>
    </Card>
  );

  return (
    <section className="px-9 py-7 pb-20 max-w-[1280px] flex flex-col gap-5">
      <Link
        to="/sessions"
        className="inline-flex items-center gap-1.5 text-xs text-ink-500 hover:text-ink-900 transition-colors no-underline"
      >
        <Icon name="chevL" size={14} />
        {t('common.back')}
      </Link>
      <PageHeader
        crumb={t(
          session.kind === 'concert' ? 'sessions.kindConcert' : 'sessions.kindPractice',
        )}
        title={formatSessionDate(session.date, i18n.language)}
      />
      {error !== null ? (
        <p className="text-danger text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {session.kind === 'concert' ? (
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
          renderConcertReadView()
        )
      ) : (
        <Card className="flex flex-col gap-2">
          <label
            className="text-[11px] tracking-wider uppercase text-ink-400 font-medium"
            htmlFor="practice-prepared-concert"
          >
            {t('sessions.preparedConcert')}
          </label>
          <select
            id="practice-prepared-concert"
            className="w-full bg-bg-elev border border-line text-ink-900 rounded-md px-3 py-2 text-[13px] outline-none focus:border-ink-700"
            value={session.preparedConcertId ?? ''}
            onChange={(event) => {
              const next = event.target.value.length === 0 ? null : event.target.value;
              void setPreparedConcert(next);
            }}
          >
            <option value="">—</option>
            {upcomingConcerts.map((concert) => (
              <option key={concert.id} value={concert.id}>
                {formatSessionDate(concert.date, i18n.language)} — {concert.venue ?? '—'}
              </option>
            ))}
          </select>
          {preparedConcert !== null ? (
            <p className="text-sm text-ink-500 mt-1">
              {t('sessions.preparesConcert')}{' '}
              <Link
                to={`/sessions/${preparedConcert.id}`}
                className="text-accent hover:underline"
              >
                {formatSessionDate(preparedConcert.date, i18n.language)}
                {preparedConcert.venue !== null ? ` — ${preparedConcert.venue}` : ''}
              </Link>
            </p>
          ) : null}
        </Card>
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
