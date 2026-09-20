import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { isCountdownUrgent, isTimeUp } from '@site/lib/countdown.core';

export interface RoundCountdownProps {
  readonly secondsRemaining: number | null;
}

// @FollowsBlueprint atom-null-render
export function RoundCountdown({ secondsRemaining }: RoundCountdownProps) {
  const { t } = useTranslation();
  if (secondsRemaining === null) return null;

  const timeUpLabel = t('game.timeUp');
  const timeLeftLabel = t('game.timeLeft', { count: secondsRemaining });

  return (
    <span
      aria-live="polite"
      className={clsx(
        'inline-flex items-center rounded-pill border-2 border-ink px-2 py-0.5 text-xs font-black tabular-nums',
        isCountdownUrgent(secondsRemaining) ? 'bg-coral-soft' : 'bg-cream',
      )}
    >
      {isTimeUp(secondsRemaining) ? timeUpLabel : timeLeftLabel}
    </span>
  );
}
