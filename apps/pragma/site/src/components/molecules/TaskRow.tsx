/** @Feature tasks */

import { isTaskOpen, type TaskStatus } from '@domain/task-status.core';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../atoms/Badge';
import { composeClassName } from '../atoms/class-name.utils';
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

const OPENING_BUTTON_CLASS =
  'flex-1 min-h-11 text-left text-[13.5px] cursor-pointer bg-transparent border-0 p-0 ' +
  'after:absolute after:inset-0';

// @FollowsBlueprint molecule-presentational
export function TaskRow(props: TaskRowProps): JSX.Element {
  const { t } = useTranslation();
  const isOpen = isTaskOpen({ status: props.status });
  const isDueDateLate = props.isOverdue && isOpen;
  return (
    <li className="relative flex items-start gap-2.5 bg-bg-elev border border-line rounded-md px-3 py-2 hover:border-line-strong transition-colors">
      <label className="relative z-10 -my-2 -ml-1 inline-flex min-w-11 min-h-11 items-center justify-center cursor-pointer">
        <input
          type="checkbox"
          checked={!isOpen}
          onChange={props.onToggleDone}
          aria-label={t('tasks.toggleDone')}
          className="w-4 h-4 accent-[var(--color-accent)] cursor-pointer"
        />
      </label>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <button type="button" className={OPENING_BUTTON_CLASS} onClick={props.onOpen}>
          <span className={composeClassName(isOpen ? 'text-ink-900' : 'text-ink-400 line-through')}>
            {props.title}
          </span>
        </button>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="mono" size="sm">
            {t(TASK_STATUS_LABEL_KEY[props.status])}
          </Badge>
          {props.songTitle === null ? null : (
            <Badge tone="default" size="sm">
              {props.songTitle}
            </Badge>
          )}
          {props.dueLabel === null ? null : (
            <span
              className={composeClassName(
                'text-xs',
                isDueDateLate ? 'text-danger font-medium' : 'text-ink-500',
              )}
            >
              {props.dueLabel}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={props.onDelete}
        aria-label={t('common.delete')}
        className="relative z-10 inline-flex shrink-0 items-center justify-center min-w-11 min-h-11 -my-1 text-ink-400 hover:text-danger text-lg leading-none cursor-pointer bg-transparent border-0"
      >
        ×
      </button>
    </li>
  );
}
