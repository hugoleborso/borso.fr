/** @Feature setlists */

import type { JSX, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { selectSetlistDisplayName } from '../../lib/setlist-name.utils';
import { Icon } from '../atoms/Icon';

interface SetlistSummaryRowProps {
  readonly id: string;
  readonly name: string;
  readonly songCount: number;
  readonly sessionsLabel: string | null;
  readonly action?: ReactNode;
}

export function SetlistSummaryRow({
  id,
  name,
  songCount,
  sessionsLabel,
  action,
}: SetlistSummaryRowProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 bg-bg-elev border border-line rounded-md px-4 py-3">
      <Link
        to={`/setlists/${id}`}
        className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
      >
        <Icon name="setlist" size={18} className="text-ink-500" />
        <div className="flex-1 min-w-0">
          <div className="font-display italic text-xl text-ink-900 leading-tight truncate">
            {selectSetlistDisplayName(name, t('setlist.untitled'))}
          </div>
          <div className="text-[12px] text-ink-500 mt-0.5 truncate">
            {t('setlist.songCount', { count: songCount })}
            {sessionsLabel === null ? null : ` · ${sessionsLabel}`}
          </div>
        </div>
        <Icon name="chevR" size={14} className="text-ink-400" />
      </Link>
      {action}
    </div>
  );
}
