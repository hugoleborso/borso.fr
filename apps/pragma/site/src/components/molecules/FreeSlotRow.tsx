/** @Feature sessions */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';

export interface FreeSlotRowProps {
  readonly day: string;
  readonly hours: string;
  readonly onBook: () => void;
}

// @FollowsBlueprint molecule-presentational
export function FreeSlotRow({ day, hours, onBook }: FreeSlotRowProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <li className="flex items-center justify-between gap-3 bg-bg-elev border border-line rounded-md px-4 py-2.5">
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3 min-w-0">
        <span className="font-display italic text-xl text-ink-900 leading-tight">{day}</span>
        <span className="font-mono text-sm text-ink-500">{hours}</span>
      </div>
      <Button
        type="button"
        variant="default"
        onClick={onBook}
        aria-label={t('freeSlots.bookAria', { day, hours })}
        className="min-h-11 shrink-0"
      >
        <Icon name="plus" size={14} />
        {t('freeSlots.book')}
      </Button>
    </li>
  );
}
