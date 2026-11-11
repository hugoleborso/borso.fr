import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { IconName } from '../atoms/Icon';
import { IndexTile } from '../molecules/IndexTile';
import { openActionSheet } from '../../lib/action-sheet.hook';
import type { DiscussionSubjectReference } from '../../lib/discussion-subject.core';
import { ROUTINE_RUN_LIST_PATH } from '../../lib/routine-run.core';
import { buildTodoListHref } from '../../lib/wikilinks.core';
import { PROPOSALS_PATH } from './proposal-board.core';

export interface TodayIndexProps {
  readonly pendingProposalCount: number;
  readonly overdueTodoCount: number;
  readonly owedCommitmentCount: number;
  readonly awaitedCommitmentCount: number;
  readonly readyDraftCount: number;
  readonly reconnectCount: number;
  readonly dueRecurringTaskCount: number | undefined;
  readonly latePageCount: number | undefined;
}

interface Tile {
  readonly key: string;
  readonly to: string;
  readonly icon: IconName;
  readonly count?: number;
  readonly label: string;
  readonly isAlert: boolean;
  readonly subject?: DiscussionSubjectReference;
}

// @FollowsBlueprint organism-presentational
export function TodayIndex({
  pendingProposalCount,
  overdueTodoCount,
  owedCommitmentCount,
  awaitedCommitmentCount,
  readyDraftCount,
  reconnectCount,
  dueRecurringTaskCount,
  latePageCount,
}: TodayIndexProps): JSX.Element {
  const { t } = useTranslation();
  const tiles: readonly Tile[] = [
    {
      key: 'proposals',
      to: PROPOSALS_PATH,
      icon: 'proposals',
      count: pendingProposalCount,
      label: t('today.counters.proposals'),
      isAlert: false,
      subject: { kind: 'folder', path: 'etat/propositions' },
    },
    {
      key: 'overdue',
      to: buildTodoListHref('main'),
      icon: 'clock',
      count: overdueTodoCount,
      label: t('today.counters.overdue'),
      isAlert: true,
      subject: { kind: 'todos', list: 'main' },
    },
    {
      key: 'owed',
      to: '/commitments?direction=owed',
      icon: 'commitment',
      count: owedCommitmentCount,
      label: t('today.counters.owed'),
      isAlert: false,
      subject: { kind: 'folder', path: 'engagements' },
    },
    {
      key: 'awaited',
      to: '/commitments?direction=awaited',
      icon: 'awaited',
      count: awaitedCommitmentCount,
      label: t('today.counters.awaited'),
      isAlert: false,
      subject: { kind: 'folder', path: 'engagements' },
    },
    {
      key: 'drafts',
      to: '/drafts',
      icon: 'draft',
      count: readyDraftCount,
      label: t('today.shortcuts.drafts'),
      isAlert: false,
      subject: { kind: 'folder', path: 'etat/brouillons' },
    },
    {
      key: 'relations',
      to: '/relations',
      icon: 'users',
      count: reconnectCount,
      label: t('today.shortcuts.relations'),
      isAlert: false,
      subject: { kind: 'relations' },
    },
    {
      key: 'recurring',
      to: '/recurring',
      icon: 'scan',
      ...(dueRecurringTaskCount === undefined ? {} : { count: dueRecurringTaskCount }),
      label: t('today.counters.recurring'),
      isAlert: true,
      subject: { kind: 'recurring' },
    },
    {
      key: 'runs',
      to: ROUTINE_RUN_LIST_PATH,
      icon: 'send',
      label: t('today.index.runs'),
      isAlert: false,
    },
    {
      key: 'history',
      to: '/history',
      icon: 'activity',
      label: t('today.shortcuts.history'),
      isAlert: false,
      subject: { kind: 'folder', path: 'journal' },
    },
    {
      key: 'memory',
      to: '/brain',
      icon: 'brain',
      ...(latePageCount === undefined ? {} : { count: latePageCount }),
      label: t('today.index.memory'),
      isAlert: false,
      subject: { kind: 'folder', path: 'second-brain' },
    },
  ];
  return (
    <nav aria-label={t('today.counters.title')} className="grid grid-cols-3 gap-2">
      {tiles.map(({ key, to, icon, count, label, isAlert, subject }) => (
        <IndexTile
          key={key}
          to={to}
          icon={icon}
          {...(count === undefined ? {} : { count })}
          label={label}
          isAlert={isAlert}
          {...(subject === undefined
            ? {}
            : {
                onLongPress: () => {
                  openActionSheet({
                    title: count === undefined ? label : `${label} · ${String(count)}`,
                    subject,
                  });
                },
              })}
        />
      ))}
    </nav>
  );
}
