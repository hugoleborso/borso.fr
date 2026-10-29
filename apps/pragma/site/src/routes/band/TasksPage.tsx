/** @Feature band */

import type { JSX } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { BottomActions } from '../../components/atoms/BottomActions';
import { Button } from '../../components/atoms/Button';
import { EmptyState } from '../../components/molecules/EmptyState';
import { PageHeader } from '../../components/molecules/PageHeader';
import { SectionTabs } from '../../components/molecules/SectionTabs';
import { MemberTaskColumn } from '../../components/organisms/MemberTaskColumn';
import { TaskList } from '../../components/organisms/TaskList';
import { TaskSheetHost } from '../../components/organisms/TaskSheetHost';
import { useTaskRowLabels, useTaskSheet } from '../../components/organisms/task-sheet.hook';
import { useSignedInMember } from '../../lib/queries/me.queries';
import { useMembersList } from '../../lib/queries/members.queries';
import { useSongsList } from '../../lib/queries/songs.queries';
import { useTasksList } from '../../lib/queries/tasks.queries';
import {
  BAND_VIEW_PARAM,
  type BandView,
  groupTasksByMember,
  isOwnTasksView,
  isTaskListEmpty,
  type MemberShape,
  readBandView,
  selectTasksOfMember,
  type TaskShape,
} from './band-tasks.core';

const NO_ROWS: readonly never[] = [];
const UNASSIGNED_GROUP_KEY = 'unassigned';

// @FollowsBlueprint route-list-page
export function TasksPage(): JSX.Element {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = readBandView(searchParams.get(BAND_VIEW_PARAM));
  const tasksQuery = useTasksList();
  const membersQuery = useMembersList();
  const songsQuery = useSongsList();
  const signedInMember = useSignedInMember();
  const taskSheet = useTaskSheet();

  const tasks = useMemo<readonly TaskShape[]>(
    () => tasksQuery.data?.tasks ?? NO_ROWS,
    [tasksQuery.data],
  );
  const members = useMemo<readonly MemberShape[]>(
    () => membersQuery.data?.members ?? NO_ROWS,
    [membersQuery.data],
  );
  const songs = useMemo(() => songsQuery.data?.songs ?? NO_ROWS, [songsQuery.data]);
  const memberTasks = useMemo(
    () => selectTasksOfMember(tasks, signedInMember.data?.memberId ?? null),
    [tasks, signedInMember.data],
  );
  const groups = useMemo(
    () => groupTasksByMember(tasks, members, t('tasks.unassigned')),
    [tasks, members, t],
  );
  const rowLabels = useTaskRowLabels(songs);
  const isOwnTasksShown = isOwnTasksView(view);
  const isMyListEmpty = isTaskListEmpty(memberTasks.length, tasksQuery.isLoading);

  const selectView = (nextView: BandView): void => {
    setSearchParams({ [BAND_VIEW_PARAM]: nextView }, { replace: true });
  };

  const errorMessage =
    tasksQuery.error === null ? taskSheet.errorMessage : tasksQuery.error.message;

  return (
    <section className="px-4 sm:px-9 py-4 sm:py-7 max-w-[1280px]">
      <PageHeader back={{ to: '/band', label: t('band.title') }} title={t('nav.tasks')}>
        <SectionTabs
          label={t('band.viewsLabel')}
          tabs={[
            { value: 'my', label: t('band.myTasks'), icon: 'tasks' },
            { value: 'everyone', label: t('band.everyone'), icon: 'members' },
          ]}
          value={view}
          onChange={selectView}
        />
      </PageHeader>
      {errorMessage === null ? null : (
        <p className="text-danger text-meta mb-3" role="alert">
          {errorMessage}
        </p>
      )}
      {tasksQuery.isLoading ? (
        <p className="text-ink-soft italic text-meta m-0">{t('common.loading')}</p>
      ) : null}
      {isOwnTasksShown ? (
        isMyListEmpty ? (
          <EmptyState icon="tasks">{t('band.noTaskOfMine')}</EmptyState>
        ) : (
          <TaskList
            label={t('band.myTasks')}
            tasks={memberTasks}
            {...rowLabels}
            onToggleDone={taskSheet.toggleDone}
            onOpen={taskSheet.openTask}
            onDelete={taskSheet.requestDeletion}
          />
        )
      ) : (
        <div className="@container min-w-0">
          <div className="grid grid-cols-1 @xl:grid-cols-2 @4xl:grid-cols-3 gap-3">
            {groups.map((group) => (
              <MemberTaskColumn
                key={group.memberId ?? UNASSIGNED_GROUP_KEY}
                group={group}
                {...rowLabels}
                onToggleDone={taskSheet.toggleDone}
                onOpen={taskSheet.openTask}
                onDelete={taskSheet.requestDeletion}
              />
            ))}
          </div>
        </div>
      )}

      <TaskSheetHost controller={taskSheet} members={members} songs={songs} />
      <BottomActions>
        <Button icon="plus" variant="primary" onClick={() => taskSheet.openNewTask()}>
          {t('tasks.newTitle')}
        </Button>
      </BottomActions>
    </section>
  );
}
