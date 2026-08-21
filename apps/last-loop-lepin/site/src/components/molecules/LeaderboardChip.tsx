import { useTranslation } from 'react-i18next';
import type { RankedRunnerDto } from '../../lib/race.types';
import { selectRunnerStatusKind, selectRunnerStatusLoop } from '../../lib/runner-status.utils';
import { FastestLapBadge } from '../atoms/FastestLapBadge';
import { Pill } from '../atoms/Pill';
import { Show } from '../atoms/Show';
import { RunnerAvatar } from './RunnerAvatar';
import { formatLastEventTime, formatRank } from './leaderboard-chip.utils';

const AVATAR_SIZE_PX = 32;

const STATUS_KEY_BY_KIND = {
  'in-race': 'leaderboard.loop',
  out: 'leaderboard.did-not-finish',
} as const;

interface LeaderboardChipProps {
  readonly entry: RankedRunnerDto;
  readonly hasFastestLap: boolean;
  readonly locale: string;
}

// @FollowsBlueprint molecule-presentational
export function LeaderboardChip({ entry, hasFastestLap, locale }: LeaderboardChipProps) {
  const { t } = useTranslation();
  const statusKind = selectRunnerStatusKind(entry.status);
  return (
    <>
      <Show when={hasFastestLap}>
        <FastestLapBadge title={t('leaderboard.fastest-lap')} />
      </Show>
      <div className="flex items-center gap-3 min-w-0">
        <span className="min-w-5 text-right font-mono tabular-nums text-[14px] text-ink-3">
          {formatRank(entry.rank, t('common.ex-aequo'))}
        </span>
        <RunnerAvatar runner={entry.runner} size={AVATAR_SIZE_PX} surface="leaderboard" />
        <span className="flex-1 min-w-0 truncate text-[14px] font-medium text-ink">
          {entry.runner.displayName}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <Pill tone={statusKind}>
          {t(STATUS_KEY_BY_KIND[statusKind], { loop: selectRunnerStatusLoop(entry.status) })}
        </Pill>
        <span className="font-mono tabular-nums text-[12px] text-ink-3">
          {formatLastEventTime(entry.lastFinishedAt, locale, t('common.empty-value'))}
        </span>
      </div>
    </>
  );
}
