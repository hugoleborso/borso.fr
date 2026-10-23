/** @Feature takes */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { formatSessionDate } from '../../lib/formatters.utils';
import { composeClassName } from '../atoms/class-name.utils';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { formatDuration } from '../molecules/song-duration.utils';
import {
  describeTakeRow,
  type ListedTakeSummary,
  type SessionSummary,
  type TakeListRow,
} from './take-list.core';

export interface TakeListProps {
  readonly rows: readonly TakeListRow<ListedTakeSummary>[];
  readonly sessions: readonly SessionSummary[];
  readonly selectedTakeId: string | null;
  readonly onSelect: (takeId: string) => void;
  readonly onRetry: (takeId: string) => void;
}

const SEPARATOR = ' · ';
const SELECTED_ROW_CLASS = 'border-accent bg-accent-soft';
const ROW_CLASS = 'border-line bg-bg';

// @FollowsBlueprint organism-presentational
export function TakeList({
  rows,
  sessions,
  selectedTakeId,
  onSelect,
  onRetry,
}: TakeListProps): JSX.Element {
  const { t, i18n } = useTranslation();

  if (rows.length === 0) {
    return <p className="text-ink-400 italic text-sm m-0">{t('takes.empty')}</p>;
  }

  return (
    <ul className="flex flex-col gap-1.5 m-0 p-0 list-none">
      {rows.map((row) => {
        const view = describeTakeRow(row, sessions);
        const summary = [
          formatSessionDate(row.recordedAt, i18n.language),
          view.session.venue ?? t(view.session.key),
          ...(view.durationSeconds === null ? [] : [formatDuration(view.durationSeconds)]),
          ...(view.author === null ? [] : [view.author.name ?? t('takes.formerMember')]),
        ].join(SEPARATOR);
        const isSelected = row.id === selectedTakeId;
        return (
          <li
            key={row.id}
            className={composeClassName(
              'flex items-center gap-2 rounded-md border px-2 sm:px-3 py-1.5',
              isSelected ? SELECTED_ROW_CLASS : ROW_CLASS,
            )}
          >
            {view.isListed ? (
              <button
                type="button"
                className="flex flex-1 min-w-0 items-center gap-2 min-h-11 text-left text-sm text-ink-900 bg-transparent border-0 cursor-pointer"
                aria-pressed={isSelected}
                onClick={() => onSelect(row.id)}
              >
                <Icon name="play" size={12} className="text-ink-500" />
                <span className="truncate">{summary}</span>
              </button>
            ) : (
              <span className="flex flex-1 min-w-0 items-center gap-2 min-h-11 text-sm text-ink-500">
                <Icon name="cloudOff" size={12} />
                <span className="truncate">{summary}</span>
              </span>
            )}
            {view.commentCount === null ? null : (
              <span className="text-xs text-ink-400 shrink-0">
                {t('takes.commentCount', { count: view.commentCount })}
              </span>
            )}
            {view.isPending ? (
              <span className="text-xs text-ink-500 italic shrink-0">{t('takes.pending')}</span>
            ) : null}
            {view.hasFailed ? (
              <>
                <span className="text-xs text-danger shrink-0">{t('takes.failed')}</span>
                <Button variant="ghost" size="sm" onClick={() => onRetry(row.id)}>
                  {t('takes.retry')}
                </Button>
              </>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
