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

const LARGE_ICON_SIZE = 28;
const COMPACT_ICON_SIZE = 14;

// @FollowsBlueprint molecule-presentational
export function StreakBadge({
  days,
  isTodayCounted,
  isJokerAvailable,
  size = 'compact',
}: StreakBadgeProps): JSX.Element {
  const { t } = useTranslation();
  const isLarge = size === 'large';
  const tone = isTodayCounted ? 'text-accent' : 'text-ink-500';
  if (!isLarge) {
    return (
      <span
        className={composeClassName(
          'inline-flex items-center gap-1 font-display italic text-lg',
          tone,
        )}
        aria-label={t('studies.streakDays', { count: days })}
        data-testid="streak-badge"
      >
        <Icon name="bolt" size={COMPACT_ICON_SIZE} />
        {days}
      </span>
    );
  }
  return (
    <div className="flex items-center gap-2" data-testid="streak-badge">
      <span
        className={composeClassName(
          'inline-flex items-center gap-1 font-display italic text-[40px] leading-none',
          tone,
        )}
      >
        <Icon name="bolt" size={LARGE_ICON_SIZE} />
        {days}
      </span>
      <span className="flex flex-col text-[13px]">
        <span className="text-ink-900">{t('studies.streakDays', { count: days })}</span>
        <span className="text-ink-500">
          {isTodayCounted ? t('studies.todayCounted') : t('studies.todayPending')}
          {' · '}
          {isJokerAvailable ? t('studies.jokerAvailable') : t('studies.jokerUsed')}
        </span>
      </span>
    </div>
  );
}
