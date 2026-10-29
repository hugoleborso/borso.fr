/** @Feature takes */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { formatSessionDate } from '../../lib/formatters.utils';
import { composeClassName } from '../atoms/class-name.utils';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { ListRow } from '../molecules/ListRow';
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

const NO_BREAK_SPACE = ' ';
const SEPARATOR = `${NO_BREAK_SPACE}· `;
const SELECTED_ROW_CLASS = 'border-accent bg-accent-soft';
const ROW_CLASS = 'border-rule bg-paper';

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
    return <p className="text-ink-soft italic text-meta m-0">{t('takes.empty')}</p>;
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
              <ListRow
                className="min-w-0 flex-1 gap-2 text-meta"
                aria-pressed={isSelected}
                isChevronShown={false}
                leading={<Icon name="play" className="text-ink-soft" />}
                onClick={() => onSelect(row.id)}
              >
                <span className="min-w-0 break-words">{summary}</span>
              </ListRow>
            ) : (
              <span className="flex flex-1 min-w-0 items-center gap-2 min-h-11 text-meta text-ink-soft">
                <Icon name="cloudOff" size="sm" />
                <span className="min-w-0 break-words">{summary}</span>
              </span>
            )}
            {view.commentCount === null ? null : (
              <span className="text-meta text-ink-soft shrink-0">
                {t('takes.commentCount', { count: view.commentCount })}
              </span>
            )}
            {view.isPending ? (
              <span className="text-meta text-ink-soft italic shrink-0">{t('takes.pending')}</span>
            ) : null}
            {view.hasFailed ? (
              <>
                <span className="text-meta text-danger shrink-0">{t('takes.failed')}</span>
                <Button icon="refresh" variant="quiet" size="sm" onClick={() => onRetry(row.id)}>
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
