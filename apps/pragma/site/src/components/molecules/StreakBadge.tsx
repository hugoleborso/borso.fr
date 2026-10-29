/** @Feature studies */

import { useTranslation } from 'react-i18next';
import { Icon } from '../atoms/Icon';
import { composeClassName } from '../atoms/class-name.utils';

export interface StreakBadgeProps {
  days: number;
  isTodayCounted: boolean;
  isJokerAvailable: boolean;
  size?: 'large' | 'compact';
}

// @FollowsBlueprint molecule-presentational
export function StreakBadge({
  days,
  isTodayCounted,
  isJokerAvailable,
  size = 'compact',
}: StreakBadgeProps): JSX.Element {
  const { t } = useTranslation();
  const isLarge = size === 'large';
  const tone = isTodayCounted ? 'text-accent' : 'text-ink-soft';
  if (!isLarge) {
    return (
      <span
        className={composeClassName(
          'inline-flex items-center gap-1 font-display text-title tabular-nums',
          tone,
        )}
        aria-label={t('studies.streakDays', { count: days })}
        data-testid="streak-badge"
      >
        <Icon name="bolt" />
        {days}
      </span>
    );
  }
  return (
    <div className="flex items-center gap-2" data-testid="streak-badge">
      <span
        className={composeClassName(
          'inline-flex items-center gap-1 font-display text-display tabular-nums',
          tone,
        )}
      >
        <Icon name="bolt" size="lg" />
        {days}
      </span>
      <span className="flex flex-col text-meta">
        <span className="text-ink">{t('studies.streakDays', { count: days })}</span>
        <span className="text-ink-soft">
          {isTodayCounted ? t('studies.todayCounted') : t('studies.todayPending')}
          {' · '}
          {isJokerAvailable ? t('studies.jokerAvailable') : t('studies.jokerUsed')}
        </span>
      </span>
    </div>
  );
}
