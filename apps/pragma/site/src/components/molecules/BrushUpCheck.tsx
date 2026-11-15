/** @Feature tasks */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { composeClassName } from '../atoms/class-name.utils';
import { MemberMark } from '../atoms/MemberMark';
import type { TaskAssignee } from './TaskRow';

export interface BrushUpCheckProps {
  readonly songTitle: string;
  readonly assignee: TaskAssignee | null;
  readonly sessionLabel: string;
  readonly isDone: boolean;
  readonly onToggle: () => void;
}

// @FollowsBlueprint molecule-presentational
export function BrushUpCheck(props: BrushUpCheckProps): JSX.Element {
  const { t } = useTranslation();
  const name = props.assignee?.name ?? t('tasks.unassigned');
  return (
    <li>
      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-meta">
        <input
          type="checkbox"
          checked={props.isDone}
          onChange={props.onToggle}
          aria-label={t('setlist.revise.toggle', { name, title: props.songTitle })}
          className="size-4 shrink-0 cursor-pointer accent-accent"
        />
        {props.assignee === null ? null : <MemberMark shape="dot" color={props.assignee.color} />}
        <span
          className={composeClassName(
            'min-w-0 flex-1 wrap-anywhere',
            props.isDone ? 'text-ink-soft line-through' : 'text-ink',
          )}
        >
          {t('setlist.revise.line', { name, session: props.sessionLabel })}
        </span>
      </label>
    </li>
  );
}
