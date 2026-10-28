/** @Feature tasks */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../atoms/Badge';
import { Card } from '../atoms/Card';
import { MemberChip } from '../molecules/MemberChip';
import { TaskList } from './TaskList';
import type { MemberTaskGroup, TaskShape } from '../../routes/band/band-tasks.core';

export interface MemberTaskColumnProps {
  readonly group: MemberTaskGroup;
  readonly dueLabelOf: (task: TaskShape) => string | null;
  readonly isOverdue: (task: TaskShape) => boolean;
  readonly songTitleOf: (task: TaskShape) => string | null;
  readonly onToggleDone: (task: TaskShape) => void;
  readonly onOpen: (task: TaskShape) => void;
  readonly onDelete: (task: TaskShape) => void;
}

// @FollowsBlueprint organism-presentational
export function MemberTaskColumn(props: MemberTaskColumnProps): JSX.Element {
  const { t } = useTranslation();
  const { group } = props;
  return (
    <Card className="flex flex-col gap-2.5 min-w-0">
      <div className="flex items-center gap-2">
        <MemberChip memberName={group.memberName} memberColor={group.memberColor} withName />
        <Badge tone="mono" size="sm">
          {group.openCount}
        </Badge>
      </div>
      {group.tasks.length === 0 ? (
        <p className="text-ink-soft italic text-meta m-0">{t('tasks.emptyColumn')}</p>
      ) : (
        <TaskList
          label={group.memberName}
          tasks={group.tasks}
          dueLabelOf={props.dueLabelOf}
          isOverdue={props.isOverdue}
          songTitleOf={props.songTitleOf}
          onToggleDone={props.onToggleDone}
          onOpen={props.onOpen}
          onDelete={props.onDelete}
        />
      )}
    </Card>
  );
}
