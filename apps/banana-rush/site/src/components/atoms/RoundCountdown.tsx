import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { isCountdownUrgent, isTimeUp } from '@site/lib/countdown.core';
import { BananaIcon } from './BananaIcon';

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
    <p
      aria-live="polite"
      className={clsx(
        'flex items-center justify-center gap-2 rounded-pill border-[3px] border-ink px-4 py-1.5 text-center text-lg font-black tabular-nums',
        isCountdownUrgent(secondsRemaining) ? 'bg-coral-soft' : 'bg-cream',
      )}
    >
      <BananaIcon className="h-4 w-4" />
      {isTimeUp(secondsRemaining) ? timeUpLabel : timeLeftLabel}
    </p>
  );
}
