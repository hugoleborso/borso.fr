/** @Feature streaks */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { BlazeMark } from '../atoms/BlazeMark';
import { composeClassName } from '../atoms/class-name.utils';
import type { WeekCell } from './flame-week.core';
import { CAPTION_CLASS, weekCellVariants } from './flame-week.variants';

export interface FlameWeekProps {
  readonly cells: readonly WeekCell[];
}

// @FollowsBlueprint molecule-presentational
export function FlameWeek({ cells }: FlameWeekProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <ol className="m-0 grid list-none grid-cols-7 gap-1 p-0">
      {cells.map((cell) => (
        <li key={cell.day} className="flex min-w-0 flex-col items-center gap-1">
          <span className="sr-only">{t(cell.labelKey, { weekday: cell.weekdayName })}</span>
          <span aria-hidden="true" className="text-label text-ink-soft">
            {cell.letter}
          </span>
          <span
            aria-hidden="true"
            data-day-state={cell.state}
            data-today={cell.isToday}
            className={composeClassName(
              weekCellVariants({ state: cell.state, isToday: cell.isToday }),
            )}
          >
            {cell.tone === null ? null : <BlazeMark tone={cell.tone} size="sm" />}
          </span>
          <span aria-hidden="true" className="flex h-4 max-w-full text-label">
            {cell.captionKey === null ? null : (
              <span className={composeClassName('truncate', CAPTION_CLASS[cell.captionKey])}>
                {t(cell.captionKey)}
              </span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}
