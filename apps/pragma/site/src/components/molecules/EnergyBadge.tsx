/** @Feature setlists */

import { useTranslation } from 'react-i18next';
import { Badge } from '../atoms/Badge';
import { composeClassName } from '../atoms/class-name.utils';

export interface EnergyBadgeProps {
  value: number | null | undefined;
  className?: string;
}

// @FollowsBlueprint molecule-presentational
export function EnergyBadge({ value, className }: EnergyBadgeProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <Badge tone="mono" className={composeClassName('px-1.5', className)}>
      <span className="text-ink-700">{t('catalog.energyBadge')}</span>
      <span className="text-ink-900">{value ?? '—'}</span>
    </Badge>
  );
}
