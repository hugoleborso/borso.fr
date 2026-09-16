/** @Feature audience-voting */

import type { JSX } from 'react';
import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getVoteCountdownTime,
  readVoteCountdownServerTime,
  subscribeVoteCountdown,
} from './vote-countdown.store';
import { secondsLeftUntil, selectCountdownFillPercent } from './vote-countdown.utils';

export interface VoteCountdownProps {
  readonly openedAtEpochMs: number;
  readonly closesAtEpochMs: number;
}

// @FollowsBlueprint molecule-clock-subscriber
export function VoteCountdown({
  openedAtEpochMs,
  closesAtEpochMs,
}: VoteCountdownProps): JSX.Element {
  const { t } = useTranslation();
  const nowEpochMs = useSyncExternalStore(
    subscribeVoteCountdown,
    getVoteCountdownTime,
    readVoteCountdownServerTime,
  );
  const secondsLeft = secondsLeftUntil(closesAtEpochMs, nowEpochMs);
  const fillPercent = selectCountdownFillPercent(
    secondsLeft,
    secondsLeftUntil(closesAtEpochMs, openedAtEpochMs),
  );
  return (
    <div className="flex flex-col gap-2" role="timer" aria-live="off">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-ink-400">
          {t('audience.timeLeft')}
        </span>
        <span className="font-mono tabular-nums text-3xl sm:text-4xl leading-none text-ink-900">
          {t('audience.secondsLeft', { count: secondsLeft })}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-sm bg-bg-sunk overflow-hidden">
        <div
          className="h-full rounded-sm bg-ink-900 transition-[width] duration-1000 ease-linear"
          style={{ width: `${fillPercent}%` }}
        />
      </div>
    </div>
  );
}
