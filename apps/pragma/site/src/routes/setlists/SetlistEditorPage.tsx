/** @Feature setlists */

import { resolveSetlistStatus } from '@domain/setlist-vote.core';
import type { JSX } from 'react';
import { useMemo, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { getCurrentTime, readServerTime, subscribeClock } from '../../clock.store';
import { BackLink } from '../../components/molecules/BackLink';
import { NotFoundNotice } from '../../components/molecules/NotFoundNotice';
import { PageHeader } from '../../components/molecules/PageHeader';
import { SetlistEditor } from '../../components/organisms/SetlistEditor';
import { SetlistHeaderActions } from '../../components/organisms/SetlistHeaderActions';
import { formatSetlistOrder } from '../../components/organisms/setlist-editor.utils';
import { didCopyTextToClipboard } from '../../lib/clipboard.adapter';
import { formatSessionDate } from '../../lib/formatters.utils';
import { useNavigateTo } from '../../lib/navigation.hook';
import { MEMBER_FILTER_PARAM } from '../../lib/next-concert.core';
import { useSignedInMember } from '../../lib/queries/me.queries';
import { useSetlistEntries } from '../../lib/queries/setlist-entries.queries';
import { useSetlist } from '../../lib/queries/setlists.queries';
import { useSongsList } from '../../lib/queries/songs.queries';
import { selectSetlistDisplayName } from '../../lib/setlist-name.utils';
import { useSetlistSessions } from '../../lib/setlist-sessions.hook';
import { buildSetlistHeader } from './setlist-header.core';
import { recordProductEvent } from '../../observability/product-event.adapter';
import {
  describeSetlistViewForEvent,
  buildSetlistViewParams,
  SETLIST_VIEW_PARAM,
  selectSetlistView,
  type SetlistView,
} from './setlist-view.core';

const NO_ROWS: readonly never[] = [];
const COPY_FEEDBACK_MS = 2000;
const LINE_SEPARATOR = ' · ';
const TOTAL_DURATION_KEY = {
  minutes: 'home.totalMinutes',
  hoursMinutes: 'home.totalHoursMinutes',
} as const;
const SESSION_KIND_KEY = {
  concert: 'sessions.kindConcert',
  practice: 'sessions.kindPractice',
} as const;

type CopyFeedback = 'copied' | 'failed' | null;

// @FollowsBlueprint route-detail-page
export function SetlistEditorPage(): JSX.Element {
  const { setlistId } = useParams<{ setlistId: string }>();
  const { t } = useTranslation();
  if (setlistId === undefined) {
    return <p className="px-4 py-4 text-danger sm:px-9 sm:py-7">{t('setlist.missingId')}</p>;
  }
  return <SetlistDetail setlistId={setlistId} />;
}

function SetlistDetail({ setlistId }: { setlistId: string }): JSX.Element {
  const { t, i18n } = useTranslation();
  const navigateTo = useNavigateTo();
  const nowEpochMs = useSyncExternalStore(subscribeClock, getCurrentTime, readServerTime);
  const setlistQuery = useSetlist(setlistId);
  const entriesQuery = useSetlistEntries(setlistId);
  const songsQuery = useSongsList();
  const signedInMember = useSignedInMember();
  const sessions = useSetlistSessions(setlistId);
  const [searchParams, setSearchParams] = useSearchParams();
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedback>(null);
  const setlist = setlistQuery.data?.setlist ?? null;
  const setlistEntries = entriesQuery.data?.entries ?? NO_ROWS;

  const songsById = useMemo(
    () => Object.fromEntries((songsQuery.data?.songs ?? NO_ROWS).map((song) => [song.id, song])),
    [songsQuery.data],
  );
  const header = buildSetlistHeader({
    sessions,
    durationsInSeconds: setlistEntries.map((entry) => songsById[entry.songId]?.durationSeconds),
    now: new Date(nowEpochMs),
  });
  const viewChoice = selectSetlistView({
    requestedView: searchParams.get(SETLIST_VIEW_PARAM),
    requestedMemberId: searchParams.get(MEMBER_FILTER_PARAM),
    signedInMemberId: signedInMember.data?.memberId ?? null,
  });
  const showView = (view: SetlistView, memberId: string | null): void => {
    setSearchParams(buildSetlistViewParams(view, memberId), { replace: true });
  };

  const copyOrder = async (): Promise<void> => {
    const isCopied = await didCopyTextToClipboard(formatSetlistOrder(setlistEntries, songsById));
    setCopyFeedback(isCopied ? 'copied' : 'failed');
    window.setTimeout(() => setCopyFeedback(null), COPY_FEEDBACK_MS);
  };

  if (setlistQuery.isLoading) {
    return (
      <p className="px-4 py-4 text-meta text-ink-soft italic sm:px-9 sm:py-7">
        {t('common.loading')}
      </p>
    );
  }

  if (setlist === null) {
    return (
      <NotFoundNotice
        message={t('setlist.notFound')}
        backTo="/setlists"
        backLabel={t('setlist.title')}
      />
    );
  }

  const displayedName = selectSetlistDisplayName(setlist.name, t('setlist.untitled'));
  const parent = header.parentSession;
  const parentLabel =
    parent === null
      ? null
      : [
          t(parent.kind === 'concert' ? SESSION_KIND_KEY.concert : SESSION_KIND_KEY.practice),
          formatSessionDate(parent.date, i18n.language),
        ].join(LINE_SEPARATOR);
  const summaryLine = [
    parentLabel,
    t('setlist.songCount', { count: header.songCount }),
    header.total === null
      ? null
      : t(TOTAL_DURATION_KEY[header.total.kind], {
          hours: header.total.hours,
          minutes: header.total.minutes,
        }),
  ]
    .filter((part) => part !== null)
    .join(LINE_SEPARATOR);

  return (
    <section className="flex max-w-[1280px] flex-col px-4 pt-1 pb-4 sm:px-9 sm:py-7">
      <div className="flex items-center justify-between gap-2">
        <BackLink to={header.backTo} label={parentLabel ?? t('setlist.title')} />
        <SetlistHeaderActions
          setlistId={setlistId}
          name={setlist.name}
          displayedName={displayedName}
          status={resolveSetlistStatus(setlist.status)}
          isConcert={sessions.some((session) => session.kind === 'concert')}
          onCopyOrder={() => void copyOrder()}
          onDeleted={() => navigateTo('/setlists')}
        />
      </div>
      <PageHeader title={displayedName} subtitle={summaryLine} className="mb-2 sm:mb-4" />
      {copyFeedback === null ? null : (
        <p
          role={copyFeedback === 'copied' ? 'status' : 'alert'}
          className="m-0 mb-2 text-meta text-ink-soft"
        >
          {copyFeedback === 'copied' ? t('setlist.orderCopied') : t('setlist.failure.copyOrder')}
        </p>
      )}
      <SetlistEditor
        setlistId={setlist.id}
        view={viewChoice.view}
        memberId={viewChoice.memberId}
        onSelectView={(view) => {
          recordProductEvent('setlist_view_changed', { view: describeSetlistViewForEvent(view) });
          showView(view, viewChoice.memberId);
        }}
        onSelectMember={(memberId) => showView('my-part', memberId)}
      />
    </section>
  );
}
