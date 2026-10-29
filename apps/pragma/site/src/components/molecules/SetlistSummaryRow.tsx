/** @Feature setlists */

import type { JSX, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { selectSetlistDisplayName } from '../../lib/setlist-name.utils';
import { Icon } from '../atoms/Icon';

interface SetlistSummaryRowProps {
  readonly id: string;
  readonly name: string;
  readonly isVoting: boolean;
  readonly songCount: number;
  readonly sessionsLabel: string | null;
  readonly action?: ReactNode;
}

export function SetlistSummaryRow({
  id,
  name,
  isVoting,
  songCount,
  sessionsLabel,
  action,
}: SetlistSummaryRowProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 bg-leaf border border-rule rounded-md px-4 py-3">
      <Link
        to={`/setlists/${id}`}
        className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
      >
        <Icon name="setlist" size="md" className="text-ink-soft" />
        <div className="flex-1 min-w-0">
          <div className="font-display text-title text-ink leading-tight truncate">
            {selectSetlistDisplayName(name, t('setlist.untitled'))}
          </div>
          <div className="text-meta text-ink-soft mt-0.5 truncate">
            {isVoting ? t('setlist.voting') : t('setlist.songCount', { count: songCount })}
            {sessionsLabel === null ? null : ` · ${sessionsLabel}`}
          </div>
        </div>
        <Icon name="chevR" size="sm" className="text-ink-soft" />
      </Link>
      {action}
    </div>
  );
}
