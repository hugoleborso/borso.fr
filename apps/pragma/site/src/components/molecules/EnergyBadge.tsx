/**
 * EnergyBadge — the "E 4" / "E 6" mono badge from the prototype.
 * Tiny, mono, sits beside song titles and on setlist rows to
 * surface the song's base energy at a glance.
 */

import { useTranslation } from 'react-i18next';
import { Badge } from '../atoms/Badge';
import { cn } from '../atoms/cn.utils';

export interface EnergyBadgeProps {
  value: number | null | undefined;
  className?: string;
}

export function EnergyBadge({ value, className }: EnergyBadgeProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <Badge tone="mono" className={cn('px-1.5', className)}>
      <span className="text-ink-700">{t('catalog.energyBadge')}</span>
      <span className="text-ink-900">{value ?? '—'}</span>
    </Badge>
  );
}
