import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { IconName } from '../atoms/Icon';
import { CounterPill } from '../molecules/CounterPill';
import { openActionSheet } from '../../lib/action-sheet.hook';
import type { DiscussionSubjectReference } from '../../lib/discussion-subject.core';
import { keepNonZeroCounters } from './today-counters.core';

export interface TodayCountersProps {
  readonly pendingProposalCount: number;
  readonly overdueTodoCount: number;
  readonly owedCommitmentCount: number;
  readonly awaitedCommitmentCount: number;
  readonly readyDraftCount: number;
  readonly reconnectCount: number;
}

interface Counter {
  readonly key: string;
  readonly to: string;
  readonly icon: IconName;
  readonly count?: number;
  readonly label: string;
  readonly isAlert: boolean;
  readonly subject: DiscussionSubjectReference;
}

// @FollowsBlueprint organism-presentational
export function TodayCounters({
  pendingProposalCount,
  overdueTodoCount,
  owedCommitmentCount,
  awaitedCommitmentCount,
  readyDraftCount,
  reconnectCount,
}: TodayCountersProps): JSX.Element {
  const { t } = useTranslation();
  const counters: readonly Counter[] = [
    {
      key: 'proposals',
      to: '/proposals',
      icon: 'proposals',
      count: pendingProposalCount,
      label: t('today.counters.proposals'),
      isAlert: false,
      subject: { kind: 'folder', path: 'etat/propositions' },
    },
    {
      key: 'overdue',
      to: '/todos',
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
      key: 'history',
      to: '/history',
      icon: 'activity',
      label: t('today.shortcuts.history'),
      isAlert: false,
      subject: { kind: 'folder', path: 'journal' },
    },
  ];
  return (
    <nav aria-label={t('today.counters.title')} className="flex flex-wrap gap-2">
      {keepNonZeroCounters(counters).map((counter) => (
        <CounterPill
          key={counter.key}
          to={counter.to}
          icon={counter.icon}
          {...(counter.count === undefined ? {} : { count: counter.count })}
          label={counter.label}
          isAlert={counter.isAlert}
          onLongPress={() => {
            openActionSheet({
              title:
                counter.count === undefined
                  ? counter.label
                  : `${counter.label} · ${String(counter.count)}`,
              subject: counter.subject,
            });
          }}
        />
      ))}
    </nav>
  );
}
