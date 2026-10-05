import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CountBadge } from '../atoms/CountBadge';
import { Icon } from '../atoms/Icon';

export interface PendingProposalsCardProps {
  readonly count: number;
}

// @FollowsBlueprint molecule-presentational
export function PendingProposalsCard({ count }: PendingProposalsCardProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <Link
      to="/proposals"
      className="flex items-center gap-3 min-h-14 px-4 rounded-lg bg-bronze-soft text-ink no-underline"
    >
      <Icon name="proposals" size={20} className="text-bronze" />
      <span className="flex-1 text-body-sm font-bold">
        {t('today.proposals.pending', { count })}
      </span>
      <CountBadge count={count} label={t('nav.pending-count', { count })} />
      <Icon name="chevron" size={16} className="text-bronze" />
    </Link>
  );
}
