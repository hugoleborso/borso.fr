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
  splitConcertHeading,
  selectNextConcert,
} from '../../lib/next-concert.core';
import { useSignedInMember } from '../../lib/queries/me.queries';
import { useSessionsList } from '../../lib/queries/sessions.queries';
import { useSetlist, useSetlistsList } from '../../lib/queries/setlists.queries';
import { resolveSetlistStatus, SETLIST_VOTING } from '@domain/setlist-vote.core';

const NO_ROWS: readonly never[] = [];
const ACTION_CLASS = composeClassName(
  buttonVariants({ variant: 'default', size: 'md' }),
  'no-underline',
);
const PRIMARY_ACTION_CLASS = composeClassName(
  buttonVariants({ variant: 'accent', size: 'md' }),
  'no-underline',
);
const ICON_ACTION_CLASS = composeClassName(
  buttonVariants({ variant: 'default', size: 'md' }),
  'no-underline w-11 px-0',
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
  const heading = splitConcertHeading(
    session.venue,
    formatSessionDate(session.date, i18n.language),
  );

  return (
    <section
      aria-label={t('nextConcert.label')}
      className="mb-3 sm:mb-4 rounded-lg border border-line bg-bg-elev p-2 pl-3 flex flex-wrap items-center gap-2"
    >
      <Link
        to={`/sessions/${session.id}`}
        className="flex-1 min-w-[8rem] min-h-11 flex flex-col justify-center no-underline text-ink-900"
      >
        <span className="font-display italic text-lg leading-tight truncate">
          {heading.primary}
        </span>
        {heading.secondary === null ? null : (
          <span className="text-xs text-ink-500 truncate">{heading.secondary}</span>
        )}
      </Link>
      {setlistId === null ? null : (
        <div className="flex gap-2">
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
            {t('nextConcert.myPart')}
          </Link>
          <Link
            to={`/setlists/${setlistId}/scene`}
            aria-label={t('nextConcert.stage')}
            title={t('nextConcert.stage')}
            className={ICON_ACTION_CLASS}
          >
            <Icon name="play" size={16} />
          </Link>
        </div>
      )}
    </section>
  );
}
