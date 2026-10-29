/** @Feature home */

import { selectNextSession } from '@domain/session-schedule.core';
import type { JSX } from 'react';
import { useMemo, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { BottomActions } from '../../components/atoms/BottomActions';
import { Button } from '../../components/atoms/Button';
import { ButtonLink } from '../../components/atoms/ButtonLink';
import { Overline } from '../../components/atoms/Overline';
import { EmptyState } from '../../components/molecules/EmptyState';
import { PageHeader } from '../../components/molecules/PageHeader';
import { SectionTabs } from '../../components/molecules/SectionTabs';
import {
  describeTotalDuration,
  type TotalDurationLabel,
} from '../../components/molecules/song-duration.utils';
import { CreateSessionDialog } from '../../components/organisms/CreateSessionDialog';
import { MemberPartList } from '../../components/organisms/MemberPartList';
import { NextSessionCard } from '../../components/organisms/NextSessionCard';
import { TaskList } from '../../components/organisms/TaskList';
import { TaskSheetHost } from '../../components/organisms/TaskSheetHost';
import { useTaskRowLabels, useTaskSheet } from '../../components/organisms/task-sheet.hook';
import { getCurrentTime, readServerTime, subscribeClock } from '../../clock.store';
import { formatSessionDate } from '../../lib/formatters.utils';
import { useNavigateTo } from '../../lib/navigation.hook';
import { buildMemberPartPath } from '../../lib/next-concert.core';
import { useInstrumentsList } from '../../lib/queries/instruments.queries';
import { useSignedInMember } from '../../lib/queries/me.queries';
import { useMembersList } from '../../lib/queries/members.queries';
import { useSessionsList } from '../../lib/queries/sessions.queries';
import { useSetlistEntries } from '../../lib/queries/setlist-entries.queries';
import { useSetlistsBySession } from '../../lib/queries/setlists.queries';
import { useSongsList } from '../../lib/queries/songs.queries';
import { useTasksList } from '../../lib/queries/tasks.queries';
import { isPracticeModeOffered } from '../sessions/practice-mode.core';
import {
  buildHomeView,
  HOME_SECTION_PARAM,
  type HomeSection,
  readHomeSection,
  selectHomePrimaryAction,
} from './home.core';
import { recordProductEvent } from '../../observability/product-event.adapter';

const NO_ROWS: readonly never[] = [];
const TOTAL_DURATION_KEY = {
  minutes: 'home.totalMinutes',
  hoursMinutes: 'home.totalHoursMinutes',
} as const;

// @FollowsBlueprint route-detail-page
export function HomePage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const navigateTo = useNavigateTo();
  const nowEpochMs = useSyncExternalStore(subscribeClock, getCurrentTime, readServerTime);
  const sessionsQuery = useSessionsList();
  const signedInMember = useSignedInMember();
  const songsQuery = useSongsList();
  const instrumentsQuery = useInstrumentsList();
  const membersQuery = useMembersList();
  const tasksQuery = useTasksList();
  const taskSheet = useTaskSheet();
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const nextSession = useMemo(
    () => selectNextSession(sessionsQuery.data?.sessions ?? NO_ROWS, new Date(nowEpochMs)),
    [sessionsQuery.data, nowEpochMs],
  );
  const setlistsQuery = useSetlistsBySession(nextSession?.id ?? '', nextSession !== null);
  const setlist = setlistsQuery.data?.setlists[0] ?? null;
  const entriesQuery = useSetlistEntries(setlist?.id ?? '', setlist !== null);
  const memberId = signedInMember.data?.memberId ?? null;
  const songs = useMemo(() => songsQuery.data?.songs ?? NO_ROWS, [songsQuery.data]);
  const rowLabels = useTaskRowLabels(songs);
  const sessionSongCount = (setlistsQuery.data?.setlists ?? NO_ROWS).reduce(
    (total, summary) => total + summary.songCount,
    0,
  );

  const view = useMemo(
    () =>
      buildHomeView({
        setlist,
        entries: entriesQuery.data?.entries ?? NO_ROWS,
        songs,
        instruments: instrumentsQuery.data?.instruments ?? NO_ROWS,
        tasks: tasksQuery.data?.tasks ?? NO_ROWS,
        memberId,
        nextSessionId: nextSession?.id ?? null,
      }),
    [
      setlist,
      entriesQuery.data,
      songs,
      instrumentsQuery.data,
      tasksQuery.data,
      memberId,
      nextSession,
    ],
  );

  const totalLabel = (label: TotalDurationLabel): string =>
    t(TOTAL_DURATION_KEY[label.kind], { hours: label.hours, minutes: label.minutes });

  const primaryAction = selectHomePrimaryAction({
    isLoading: sessionsQuery.isLoading,
    nextSessionId: nextSession?.id ?? null,
    setlistId: setlist?.id ?? null,
    isPracticeModeOffered:
      nextSession !== null &&
      isPracticeModeOffered({
        kind: nextSession.kind,
        date: nextSession.date,
        songCount: sessionSongCount,
        now: new Date(nowEpochMs),
      }),
  });
  const primaryLink = primaryAction.link;
  const isPartShown = setlist !== null && view.memberPart.length > 0;
  const section = readHomeSection(searchParams.get(HOME_SECTION_PARAM), isPartShown);
  const showSection = (next: HomeSection): void => {
    setSearchParams({ [HOME_SECTION_PARAM]: next }, { replace: true });
  };
  const greetingName = signedInMember.data?.firstName ?? '';

  const panelBySection: Readonly<Record<HomeSection, JSX.Element | null>> = {
    part:
      setlist === null ? null : (
        <div className="flex flex-col gap-2">
          {memberId === null ? <Overline>{t('home.yourPart')}</Overline> : null}
          <MemberPartList
            label={t('home.yourPart')}
            rows={view.memberPart}
            path={buildMemberPartPath(setlist.id, memberId ?? '')}
          />
        </div>
      ),
    tasks:
      memberId === null ? null : (
        <div className="flex flex-col gap-2">
          {isPartShown ? null : <Overline>{t('home.yourTasks')}</Overline>}
          {view.memberTasks.length === 0 ? (
            <p className="m-0 text-meta text-ink-soft">{t('home.noOpenTask')}</p>
          ) : (
            <TaskList
              label={t('home.yourTasks')}
              tasks={view.memberTasks}
              {...rowLabels}
              onToggleDone={taskSheet.toggleDone}
              onOpen={taskSheet.openTask}
              onDelete={taskSheet.requestDeletion}
            />
          )}
        </div>
      ),
  };

  return (
    <section className="flex max-w-[640px] flex-col gap-5 px-4 py-4 sm:px-9 sm:py-7">
      <PageHeader
        crumb={greetingName === '' ? null : t('home.greeting', { name: greetingName })}
        title={t('home.title')}
        className="mb-0 sm:mb-0"
      />
      {sessionsQuery.isLoading ? (
        <p className="m-0 text-meta italic text-ink-soft">{t('common.loading')}</p>
      ) : null}

      {primaryAction.isNewSessionOffered ? (
        <EmptyState icon="sessions">{t('home.noSessionAhead')}</EmptyState>
      ) : null}
      {nextSession === null ? null : (
        <NextSessionCard
          isConcert={nextSession.kind === 'concert'}
          dateLabel={formatSessionDate(nextSession.date, i18n.language)}
          sessionPath={`/sessions/${nextSession.id}`}
          venue={nextSession.venue}
          setlistName={setlist?.name ?? null}
          songCount={setlist?.songCount ?? null}
          totalLabel={
            view.totalSeconds === null ? null : totalLabel(describeTotalDuration(view.totalSeconds))
          }
        />
      )}

      {isPartShown && memberId !== null ? (
        <SectionTabs
          label={t('home.sectionsLabel')}
          tabs={[
            { value: 'part', label: t('home.yourPart'), icon: 'song' },
            { value: 'tasks', label: t('home.yourTasks'), icon: 'tasks' },
          ]}
          value={section}
          onChange={showSection}
        />
      ) : null}

      {panelBySection[section]}

      <TaskSheetHost
        controller={taskSheet}
        members={membersQuery.data?.members ?? NO_ROWS}
        songs={songs}
      />
      {isCreatingSession ? (
        <CreateSessionDialog
          kind="practice"
          onClose={() => setIsCreatingSession(false)}
          onCreated={(sessionId) => navigateTo(`/sessions/${sessionId}`)}
        />
      ) : null}
      <BottomActions>
        {primaryAction.isNewSessionOffered ? (
          <Button icon="plus" variant="primary" onClick={() => setIsCreatingSession(true)}>
            {t('sessions.newSession')}
          </Button>
        ) : null}
        {primaryLink === null ? null : (
          <ButtonLink
            icon={primaryLink.icon}
            variant="primary"
            to={primaryLink.to}
            onClick={() => {
              if (primaryLink.startsPracticeMode) recordProductEvent('practice_mode_started');
            }}
          >
            {t(primaryLink.labelKey)}
          </ButtonLink>
        )}
      </BottomActions>
    </section>
  );
}
