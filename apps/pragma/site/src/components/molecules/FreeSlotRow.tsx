/** @Feature sessions */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';

export interface FreeSlotRowProps {
  readonly day: string;
  readonly hours: string;
  readonly onBook: () => void;
}

// @FollowsBlueprint molecule-presentational
export function FreeSlotRow({ day, hours, onBook }: FreeSlotRowProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <li className="flex items-center justify-between gap-3 bg-leaf border border-rule rounded-md px-4 py-2.5">
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3 min-w-0">
        <span className="font-display text-title text-ink">{day}</span>
        <span className="text-meta text-ink-soft tabular-nums">{hours}</span>
      </div>
      <Button
        variant="secondary"
        icon="plus"
        onClick={onBook}
        aria-label={t('freeSlots.bookAria', { day, hours })}
        className="shrink-0"
      >
        {t('freeSlots.book')}
      </Button>
    </li>
  );
}
