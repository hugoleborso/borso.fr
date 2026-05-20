/**
 * MasteryBadge — mono "M 7.2" / "M —" indicator showing the mean
 * mastery the lineup has on this song. Renders an em-dash when the
 * mean is unavailable.
 */

import { useTranslation } from 'react-i18next';
import { Badge } from '../atoms/Badge';
import { cn } from '../atoms/cn.utils';

export interface MasteryBadgeProps {
  value: number | null | undefined;
  className?: string;
}

const DECIMAL_PLACES = 1;

export function MasteryBadge({ value, className }: MasteryBadgeProps): JSX.Element {
  const { t } = useTranslation();
  const display = value === null || value === undefined ? '—' : value.toFixed(DECIMAL_PLACES);
  return (
    <Badge tone="mono" className={cn('px-1.5', className)}>
      <span className="text-ink-700">{t('catalog.masteryBadge')}</span>
      <span className="text-ink-900">{display}</span>
    </Badge>
  );
}
