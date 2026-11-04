/** @Feature setlist-voting */

import clsx from 'clsx';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type BudgetNotice,
  selectBudgetNotice,
  selectSpentShare,
} from '../../routes/setlists/vote-deck.core';
import { Overline } from '../atoms/Overline';

export interface VoteBudgetBarProps {
  readonly total: number;
  readonly remaining: number;
  readonly isExhausted: boolean;
}

const NOTICE_BY_KIND = {
  none: null,
  spent: { key: 'voting.budgetSpent', className: 'text-ink-soft', role: 'status' },
  refused: { key: 'voting.budgetExhausted', className: 'text-danger', role: 'alert' },
} as const satisfies Readonly<
  Record<BudgetNotice, { key: string; className: string; role: string } | null>
>;

// @FollowsBlueprint molecule-presentational
export function VoteBudgetBar({ total, remaining, isExhausted }: VoteBudgetBarProps): JSX.Element {
  const { t } = useTranslation();
  const spentShare = selectSpentShare(total, remaining);
  const shownRemaining = Math.max(remaining, 0);
  const notice = NOTICE_BY_KIND[selectBudgetNotice(remaining, isExhausted)];
  return (
    <div className="sticky top-0 z-10 bg-paper/95 backdrop-blur px-4 py-3 border-b border-rule">
      <div className="flex items-baseline justify-between gap-3">
        <Overline>{t('voting.budgetLabel')}</Overline>
        <span className="font-sans font-semibold tabular-nums text-ink">
          {shownRemaining} / {total}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-rule overflow-hidden">
        <div className="h-full bg-accent" style={{ width: `${String(spentShare)}%` }} />
      </div>
      {notice === null ? null : (
        <p className={clsx('mt-2 text-meta m-0', notice.className)} role={notice.role}>
          {t(notice.key)}
        </p>
      )}
    </div>
  );
}
