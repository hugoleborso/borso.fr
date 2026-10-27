/** @Feature tasks */

import { isTaskOpen, type TaskStatus } from '@domain/task-status.core';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../atoms/Badge';
import { composeClassName } from '../atoms/class-name.utils';
import { IconButton } from '../atoms/IconButton';
import { ListRow } from './ListRow';
import { TASK_STATUS_LABEL_KEY } from '../../routes/tasks/tasks-page.core';

export interface TaskRowProps {
  readonly title: string;
  readonly status: TaskStatus;
  readonly dueLabel: string | null;
  readonly songTitle: string | null;
  readonly isOverdue: boolean;
  readonly onToggleDone: () => void;
  readonly onOpen: () => void;
  readonly onDelete: () => void;
}

const OPENING_BUTTON_CLASS = 'flex-1 text-body after:absolute after:inset-0';

// @FollowsBlueprint molecule-presentational
export function TaskRow(props: TaskRowProps): JSX.Element {
  const { t } = useTranslation();
  const isOpen = isTaskOpen({ status: props.status });
  const isDueDateLate = props.isOverdue && isOpen;
  return (
    <li className="relative flex items-start gap-2.5 rounded-md bg-leaf px-3 py-2 shadow-leaf transition-colors hover:bg-hover">
      <label className="relative z-10 -my-2 -ml-1 inline-flex min-w-11 min-h-11 items-center justify-center cursor-pointer">
        <input
          type="checkbox"
          checked={!isOpen}
          onChange={props.onToggleDone}
          aria-label={t('tasks.toggleDone')}
          className="size-4 cursor-pointer accent-accent"
        />
      </label>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <ListRow className={OPENING_BUTTON_CLASS} isChevronShown={false} onClick={props.onOpen}>
          <span
            className={composeClassName(
              'min-w-0 wrap-anywhere',
              isOpen ? 'text-ink' : 'text-ink-soft line-through',
            )}
          >
            {props.title}
          </span>
        </ListRow>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="mono" size="sm">
            {t(TASK_STATUS_LABEL_KEY[props.status])}
          </Badge>
          {props.songTitle === null ? null : (
            <Badge tone="default" size="sm" className="min-w-0 max-w-full">
              <span className="truncate">{props.songTitle}</span>
            </Badge>
          )}
          {props.dueLabel === null ? null : (
            <span
              className={composeClassName(
                'text-meta',
                isDueDateLate ? 'text-danger font-medium' : 'text-ink-soft',
              )}
            >
              {props.dueLabel}
            </span>
          )}
        </div>
      </div>
      <IconButton
        variant="danger"
        icon="trash"
        label={t('common.delete')}
        onClick={props.onDelete}
        className="relative z-10 -my-1"
      />
    </li>
  );
}
