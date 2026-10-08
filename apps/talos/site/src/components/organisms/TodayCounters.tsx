import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardTile } from '../molecules/DashboardTile';
import { openActionSheet } from '../../lib/action-sheet.hook';
import type { DiscussionSubjectReference } from '../../lib/discussion-subject.core';
import type { IconName } from '../atoms/Icon';

export interface TodayCountersProps {
  readonly pendingProposalCount: number;
  readonly overdueTodoCount: number;
  readonly owedCommitmentCount: number;
  readonly awaitedCommitmentCount: number;
}

interface CounterTile {
  readonly key: string;
  readonly to: string;
  readonly icon: IconName;
  readonly count: number;
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
}: TodayCountersProps): JSX.Element {
  const { t } = useTranslation();
  const tiles: readonly CounterTile[] = [
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
      isAlert: overdueTodoCount > 0,
      subject: { kind: 'todos' },
    },
    {
      key: 'owed',
      to: '/commitments?direction=owed',
      icon: 'owed',
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
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
      {tiles.map((tile) => (
        <DashboardTile
          key={tile.key}
          to={tile.to}
          icon={tile.icon}
          count={tile.count}
          label={tile.label}
          isAlert={tile.isAlert}
          onLongPress={() => {
            openActionSheet({
              title: `${tile.label} · ${String(tile.count)}`,
              subject: tile.subject,
            });
          }}
        />
      ))}
    </div>
  );
}
