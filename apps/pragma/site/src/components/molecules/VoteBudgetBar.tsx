/** @Feature setlist-voting */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { isBudgetExhausted, selectSpentShare } from '../../routes/setlists/vote-deck.core';
import { Crumb } from '../atoms/Crumb';

export interface VoteBudgetBarProps {
  readonly total: number;
  readonly remaining: number;
  readonly isExhausted: boolean;
}

// @FollowsBlueprint molecule-presentational
export function VoteBudgetBar({ total, remaining, isExhausted }: VoteBudgetBarProps): JSX.Element {
  const { t } = useTranslation();
  const spentShare = selectSpentShare(total, remaining);
  const shownRemaining = Math.max(remaining, 0);
  const isSpent = isExhausted || isBudgetExhausted(remaining);
  return (
    <div className="sticky top-0 z-10 bg-bg/95 backdrop-blur px-4 py-3 border-b border-line">
      <div className="flex items-baseline justify-between gap-3">
        <Crumb>{t('voting.budgetLabel')}</Crumb>
        <span className="font-sans font-semibold tabular-nums text-ink-900">
          {shownRemaining} / {total}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-line overflow-hidden">
        <div className="h-full bg-accent" style={{ width: `${String(spentShare)}%` }} />
      </div>
      {isSpent ? (
        <p className="mt-2 text-sm text-danger m-0" role="alert">
          {t('voting.budgetExhausted')}
        </p>
      ) : null}
    </div>
  );
}
