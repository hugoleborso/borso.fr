/** @Feature sessions */

import type { JSX } from 'react';
import { useMemo, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { getCurrentTime, readServerTime, subscribeClock } from '../../clock.store';
import { buttonVariants } from '../atoms/button.variants';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { formatSessionDate } from '../../lib/formatters.utils';
import {
  buildMemberPartPath,
  joinConcertHeading,
  selectNextConcert,
} from '../../lib/next-concert.core';
import { useSignedInMember } from '../../lib/queries/me.queries';
import { useSessionsList } from '../../lib/queries/sessions.queries';
import { useSetlist, useSetlistsList } from '../../lib/queries/setlists.queries';
import { resolveSetlistStatus, SETLIST_VOTING } from '../../routes/setlists/setlist-status.core';

const NO_ROWS: readonly never[] = [];
const ACTION_CLASS = composeClassName(
  buttonVariants({ variant: 'default', size: 'md' }),
  'no-underline flex-1 sm:flex-none',
);
const PRIMARY_ACTION_CLASS = composeClassName(
  buttonVariants({ variant: 'accent', size: 'md' }),
  'no-underline flex-1 sm:flex-none',
);

// @FollowsBlueprint organism-query-owning
export function NextConcertStrip(): JSX.Element | null {
  const { t, i18n } = useTranslation();
  const sessionsQuery = useSessionsList();
  const setlistsQuery = useSetlistsList();
  const signedInMember = useSignedInMember();
  const nowEpochMs = useSyncExternalStore(subscribeClock, getCurrentTime, readServerTime);

  const nextConcert = useMemo(
    () =>
      selectNextConcert(
        sessionsQuery.data?.sessions ?? NO_ROWS,
        setlistsQuery.data?.setlists ?? NO_ROWS,
        nowEpochMs,
      ),
    [sessionsQuery.data, setlistsQuery.data, nowEpochMs],
  );
  const setlistId = nextConcert?.setlistId ?? null;
  const setlistQuery = useSetlist(setlistId ?? '', setlistId !== null);

  if (nextConcert === null) return null;

  const { session } = nextConcert;
  const isVoteOpen = resolveSetlistStatus(setlistQuery.data?.setlist.status) === SETLIST_VOTING;
  const heading = joinConcertHeading(session.venue, formatSessionDate(session.date, i18n.language));

  return (
    <section
      aria-label={t('nextConcert.label')}
      className="mb-4 rounded-lg border border-line bg-bg-elev p-3 flex flex-col gap-2.5"
    >
      <Link
        to={`/sessions/${session.id}`}
        className="flex items-center justify-between gap-2 min-h-11 no-underline text-ink-900"
      >
        <span className="min-w-0">
          <span className="block text-xs tracking-wider uppercase text-ink-400">
            {t('nextConcert.label')}
          </span>
          <span className="block font-display italic text-xl leading-tight truncate">
            {heading}
          </span>
        </span>
        <Icon name="chevR" size={16} />
      </Link>
      {setlistId === null ? null : (
        <div className="flex flex-wrap gap-2">
          {isVoteOpen ? (
            <Link to={`/setlists/${setlistId}/vote`} className={PRIMARY_ACTION_CLASS}>
              <Icon name="vote" size={14} />
              {t('nextConcert.vote')}
            </Link>
          ) : null}
          <Link
            to={buildMemberPartPath(setlistId, signedInMember.data?.memberId ?? '')}
            className={isVoteOpen ? ACTION_CLASS : PRIMARY_ACTION_CLASS}
          >
            <Icon name="setlist" size={14} />
            {t('nextConcert.myPart')}
          </Link>
          <Link to={`/setlists/${setlistId}/scene`} className={ACTION_CLASS}>
            <Icon name="play" size={14} />
            {t('nextConcert.stage')}
          </Link>
        </div>
      )}
    </section>
  );
}
