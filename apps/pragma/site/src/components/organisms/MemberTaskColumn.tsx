/** @Feature tasks */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../atoms/Badge';
import { Card } from '../atoms/Card';
import { MemberChip } from '../molecules/MemberChip';
import { TaskRow } from '../molecules/TaskRow';
import type { MemberTaskGroup, TaskShape } from '../../routes/tasks/tasks-page.core';

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
        <p className="text-ink-400 italic text-[13px] m-0">{t('tasks.emptyColumn')}</p>
      ) : (
        <ul className="flex flex-col gap-1.5 list-none p-0 m-0" aria-label={group.memberName}>
          {group.tasks.map((task) => (
            <TaskRow
              key={task.id}
              title={task.title}
              status={task.status}
              dueLabel={props.dueLabelOf(task)}
              isOverdue={props.isOverdue(task)}
              songTitle={props.songTitleOf(task)}
              onToggleDone={() => props.onToggleDone(task)}
              onOpen={() => props.onOpen(task)}
              onDelete={() => props.onDelete(task)}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
