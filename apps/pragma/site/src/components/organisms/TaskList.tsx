/** @Feature tasks */

import type { JSX } from 'react';
import { type TaskAssignee, TaskRow } from '../molecules/TaskRow';
import type { TaskShape } from '../../routes/band/band-tasks.core';

export interface TaskListProps {
  readonly label: string;
  readonly tasks: readonly TaskShape[];
  readonly dueLabelOf: (task: TaskShape) => string | null;
  readonly isOverdue: (task: TaskShape) => boolean;
  readonly songTitleOf: (task: TaskShape) => string | null;
  readonly assigneeOf?: (task: TaskShape) => TaskAssignee | null;
  readonly onToggleDone: (task: TaskShape) => void;
  readonly onOpen: (task: TaskShape) => void;
  readonly onDelete: (task: TaskShape) => void;
}

// @FollowsBlueprint organism-presentational
export function TaskList(props: TaskListProps): JSX.Element {
  return (
    <ul className="m-0 flex min-w-0 list-none flex-col gap-1.5 p-0" aria-label={props.label}>
      {props.tasks.map((task) => (
        <TaskRow
          key={task.id}
          title={task.title}
          status={task.status}
          dueLabel={props.dueLabelOf(task)}
          isOverdue={props.isOverdue(task)}
          songTitle={props.songTitleOf(task)}
          assignee={props.assigneeOf?.(task) ?? null}
          onToggleDone={() => props.onToggleDone(task)}
          onOpen={() => props.onOpen(task)}
          onDelete={() => props.onDelete(task)}
        />
      ))}
    </ul>
  );
}
